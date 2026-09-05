#!/usr/bin/env node
/* Validate structure, metadata, and phase readiness of a discussion memory file. */

const fs = require('fs');
const path = require('path');

const CORE_HEADINGS = [
  "Objective",
  "Current Understanding",
  "Requirements",
  "Verified Findings",
  "Confirmed Decisions",
  "Constraints",
  "Out of Scope",
  "Proposed Implementation",
  "Expected File Changes",
  "Open Questions",
  "Risks and Conflicts",
  "Acceptance Criteria",
];

const REVIEW_REQUIRED_HEADINGS = [
  "Objective",
  "Requirements",
  "Verified Findings",
  "Proposed Implementation",
  "Expected File Changes",
  "Change Reconciliation",
  "Impact Analysis",
  "Verification Plan",
  "Verification Results",
  "Acceptance Criteria",
];

const REQUIRED_METADATA = [
  "ticket",
  "topic",
  "status",
  "phase",
  "memory-version",
  "implementation-approved",
  "validation",
  "last-updated",
];

const ALLOWED_STATUS = new Set(["active", "blocked", "completed", "cancelled"]);
const ALLOWED_PHASES = new Set(["discussion", "implementation", "review", "completed"]);
const ALLOWED_VALIDATION = new Set(["pending", "passed", "failed"]);
const PLACEHOLDER_PATTERNS = [
  /<ticket-number>/i,
  /<discussion-topic>/i,
  /<yyyy-mm-dd>/i,
  /\bTODO\b/,
  /\bTBD\b/,
];

function parseYamlValue(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYaml(text) {
  const metadata = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    const value = key === "template-version"
      ? rawValue.replace(/^(?:"|')|(?:"|')$/g, "")
      : parseYamlValue(rawValue);
    metadata[key] = value;
  }
  return metadata;
}

function parseDocument(text) {
  const cleanText = text.replace(/^\uFEFF/, '');
  const match = cleanText.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!match) return { metadata: {}, body: cleanText, range: null };
  const metadata = parseYaml(match[1]);
  return {
    metadata,
    body: cleanText.slice(match[0].length),
    range: [match.index, match.index + match[0].length],
  };
}

function sectionBody(body, heading) {
  const pattern = new RegExp(
    `^##\\s+${escapeRegex(heading)}\\s*\\r?$\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    "m"
  );
  const match = body.match(pattern);
  return match ? match[1].trim() : null;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isEmptySection(body) {
  const cleaned = body.trim().toLowerCase().replace(/[.!]+$/, "").trim();
  return !cleaned || ["none", "n/a", "no open questions", "- none", "- n/a", "- no open questions"].includes(cleaned);
}

function listItems(body) {
  return [...body.matchAll(/^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/gm)].map(match => match[1].replace(/\r$/, ''));
}

function validateOpenQuestions(body) {
  const errors = [];
  if (body === null || isEmptySection(body)) return { errors, hasBlocking: false };

  const items = listItems(body);
  if (!items.length) {
    return {
      errors: ["Open Questions must use list items labeled [blocking] or [non-blocking]"],
      hasBlocking: true,
    };
  }

  for (const item of items) {
    if (!/^\[(?:blocking|non-blocking)\]\s+\S/.test(item)) {
      errors.push(`Open Questions item must start with [blocking] or [non-blocking]: ${item}`);
    }
  }

  return {
    errors,
    hasBlocking: items.some(item => /^\[blocking\]\s+\S/.test(item)) || errors.length > 0,
  };
}

function validateAcceptanceLabels(body, hasDod) {
  const errors = [];
  if (hasDod !== true) return errors;

  const items = listItems(body || "");
  if (!items.length) {
    return ["Metadata has-dod is true but Acceptance Criteria contains no list items"];
  }

  const seen = new Set();
  const lastNumber = { DoD: 0, Derived: 0 };
  let hasDodItem = false;

  for (const item of items) {
    const match = item.match(/^\[(DoD|Derived)-([1-9]\d*)\]\s+\S/);
    if (!match) {
      errors.push(`Acceptance Criteria item must start with [DoD-n] or [Derived-n]: ${item}`);
      continue;
    }

    const label = `${match[1]}-${match[2]}`;
    const number = Number(match[2]);
    if (seen.has(label)) errors.push(`Duplicate Acceptance Criteria label: ${label}`);
    if (number <= lastNumber[match[1]]) {
      errors.push(`${match[1]} labels must appear in increasing numeric order`);
    }
    seen.add(label);
    lastNumber[match[1]] = number;
    if (match[1] === "DoD") hasDodItem = true;
  }

  if (!hasDodItem) errors.push("Metadata has-dod is true but no [DoD-n] criterion exists");
  return errors;
}

function expectedFilename(ticket, topic) {
  return `${ticket}-${topic}.md`;
}

function isValidDate(str) {
  if (typeof str !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  const [y, m, day] = str.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

function validate(filePath, requestedPhase) {
  const errors = [];
  const text = fs.readFileSync(filePath, "utf-8");
  const { metadata, body } = parseDocument(text);

  if (!metadata || Object.keys(metadata).length === 0) {
    errors.push("Missing or invalid YAML metadata frontmatter");
  }

  for (const field of REQUIRED_METADATA) {
    if (!(field in metadata)) {
      errors.push(`Missing metadata field: ${field}`);
    }
  }

  const ticket = String(metadata.ticket || "").trim();
  const topic = String(metadata.topic || "").trim();

  if (ticket && !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(ticket)) {
    errors.push("Metadata ticket must contain letters, digits, and internal hyphens only");
  }
  if (topic && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic)) {
    errors.push("Metadata topic must be lowercase kebab-case");
  }
  if (ticket && topic && path.basename(filePath) !== expectedFilename(ticket, topic)) {
    errors.push(`Filename must match metadata: ${expectedFilename(ticket, topic)}`);
  }

  const status = metadata.status;
  const phase = metadata.phase;
  const validation = metadata.validation;
  const approved = metadata["implementation-approved"];
  const hasDod = metadata["has-dod"];
  const templateVersion = metadata["template-version"];
  const version = metadata["memory-version"];
  const lastUpdated = metadata["last-updated"];

  if (!ALLOWED_STATUS.has(status)) {
    errors.push("Metadata status must be one of: active, blocked, completed, cancelled");
  }
  if (!ALLOWED_PHASES.has(phase)) {
    errors.push("Metadata phase must be one of: discussion, implementation, review, completed");
  }
  if (!ALLOWED_VALIDATION.has(validation)) {
    errors.push("Metadata validation must be one of: pending, passed, failed");
  }
  if (typeof approved !== "boolean") {
    errors.push("Metadata implementation-approved must be true or false");
  }
  if ("has-dod" in metadata && typeof hasDod !== "boolean") {
    errors.push("Metadata has-dod must be true or false when present");
  }
  if ("template-version" in metadata &&
      (typeof templateVersion !== "string" || !/^[1-9]\d*\.\d+$/.test(templateVersion))) {
    errors.push("Metadata template-version must use two-part semantic version format, for example 1.0");
  }
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    errors.push("Metadata memory-version must be a positive integer");
  }

  if (!isValidDate(lastUpdated)) {
    errors.push("Metadata last-updated must be a valid YYYY-MM-DD date");
  }

  const titleMatch = body.match(/^#\s+(.+?)\s*$/m);
  if (ticket && topic) {
    const expectedTitle = `${ticket} - ${topic}`;
    if (!titleMatch || titleMatch[1].trim() !== expectedTitle) {
      errors.push(`Document title must be: # ${expectedTitle}`);
    }
  }

  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map(m => m[1]);
  const seen = new Set();
  const duplicates = [];
  for (const h of headings) {
    if (seen.has(h)) duplicates.push(h);
    seen.add(h);
  }
  if (duplicates.length) {
    errors.push("Duplicate headings: " + [...new Set(duplicates)].sort().join(", "));
  }

  for (const heading of CORE_HEADINGS) {
    if (sectionBody(body, heading) === null) {
      errors.push(`Missing core section: ${heading}`);
    }
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) {
      errors.push(`Unresolved placeholder matching: ${pattern.source}`);
    }
  }

  const openQuestions = sectionBody(body, "Open Questions");
  const openQuestionValidation = validateOpenQuestions(openQuestions);
  errors.push(...openQuestionValidation.errors);

  if (status === "blocked") {
    if (!openQuestionValidation.hasBlocking) {
      errors.push("Metadata status blocked requires a [blocking] item in Open Questions");
    }
    if (phase === "completed") {
      errors.push("Metadata status blocked cannot use phase completed");
    }
  }

  const acceptanceCriteria = sectionBody(body, "Acceptance Criteria");
  errors.push(...validateAcceptanceLabels(acceptanceCriteria, hasDod));

  if (requestedPhase === "discussion") {
    if (phase !== "discussion") {
      errors.push("Discussion validation requires metadata phase: discussion");
    }
  } else if (requestedPhase === "implementation") {
    if (phase !== "implementation") {
      errors.push("Implementation validation requires metadata phase: implementation");
    }
    if (approved !== true) {
      errors.push("Implementation validation requires implementation-approved: true");
    }
  } else if (requestedPhase === "review") {
    if (phase !== "review") {
      errors.push("Review validation requires metadata phase: review");
    }
    if (status !== "active") {
      errors.push("Review validation requires metadata status: active");
    }
    if (approved !== true) {
      errors.push("Review validation requires implementation-approved: true");
    }
  } else if (requestedPhase === "completion") {
    if (phase !== "completed") {
      errors.push("Completion validation requires metadata phase: completed");
    }
    if (status !== "completed") {
      errors.push("Completion validation requires metadata status: completed");
    }
    if (approved !== true) {
      errors.push("Completion validation requires implementation-approved: true");
    }
  }

  if (["implementation", "review", "completion"].includes(requestedPhase)) {
    const requiredHeadings = requestedPhase === "implementation"
      ? ["Objective", "Requirements", "Proposed Implementation", "Acceptance Criteria"]
      : REVIEW_REQUIRED_HEADINGS;
    for (const heading of requiredHeadings) {
      const section = sectionBody(body, heading);
      if (section === null || !section.trim()) {
        errors.push(`Section must not be empty for ${requestedPhase}: ${heading}`);
      }
    }
    if (openQuestionValidation.hasBlocking) {
      errors.push(`Open Questions contains a [blocking] item for ${requestedPhase}`);
    }
  }

  return { errors, metadata, body, text };
}

function dumpYaml(metadata) {
  const lines = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null) {
      lines.push(`${key}: null`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "string" && /[:#"'{}\[\],&|*!?`]/.test(value)) {
      const quoted = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      lines.push(`${key}: "${quoted}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

function writeMetadata(filePath, metadata, body, passed) {
  metadata.validation = passed ? "passed" : "failed";
  const rendered = dumpYaml(metadata);
  fs.writeFileSync(filePath, `---\n${rendered}\n---\n\n${body.replace(/^\s+/, "")}`, "utf-8");
}

function main() {
  const args = process.argv.slice(2);
  let fileArg = null;
  let requestedPhase = "discussion";
  let updateMetadata = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--phase") {
      requestedPhase = args[++i];
    } else if (args[i] === "--update-metadata") {
      updateMetadata = true;
    } else if (!fileArg && !args[i].startsWith("--")) {
      fileArg = args[i];
    }
  }

  if (!fileArg) {
    console.error("Usage: node validate_discussion.js <file> [--phase discussion|implementation|review|completion] [--update-metadata]");
    process.exit(2);
  }

  if (!["discussion", "implementation", "review", "completion"].includes(requestedPhase)) {
    console.error(`Invalid phase: ${requestedPhase}`);
    process.exit(2);
  }

  const file = path.resolve(fileArg);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    console.error(`ERROR: file not found: ${file}`);
    process.exit(2);
  }

  const { errors, metadata, body } = validate(file, requestedPhase);

  if (updateMetadata && metadata && Object.keys(metadata).length) {
    writeMetadata(file, metadata, body, !errors.length);
  }

  if (errors.length) {
    console.error("Discussion validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Discussion validation passed for phase: ${requestedPhase}`);
  process.exit(0);
}

main();
