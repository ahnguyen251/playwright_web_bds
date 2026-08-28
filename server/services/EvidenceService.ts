import fs from 'node:fs';
import path from 'node:path';

import {
  EvidenceReadRepository,
  type EvidenceRecord,
} from '../../database/repositories/EvidenceReadRepository';
import type { DatabaseConnection } from '../../database/sqlite';
import { classifyAttachment } from '../../services/evidence/evidence-policy';
import { NotFoundError } from '../utils/errors';

export type EvidenceUnavailableReason = 'FILE_MISSING' | 'OUTSIDE_ROOT' | 'UNSUPPORTED_TYPE';

export class InvalidEvidencePathError extends Error {
  constructor() {
    super('Invalid evidence path');
    this.name = 'InvalidEvidencePathError';
  }
}

export class UnsupportedEvidenceTypeError extends Error {
  constructor() {
    super('Unsupported evidence type');
    this.name = 'UnsupportedEvidenceTypeError';
  }
}

interface AvailableEvidence {
  readonly available: true;
  readonly filePath: string;
  readonly mimeType: string;
  readonly type: string;
  readonly safeFilename: string;
}

interface UnavailableEvidence {
  readonly available: false;
  readonly reason: EvidenceUnavailableReason;
}

type EvidenceAvailability = AvailableEvidence | UnavailableEvidence;

const isContainedBy = (root: string, candidate: string): boolean => {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === '' ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`))
  );
};

const toSafeFilename = (recordPath: string): string => {
  const basename = path.posix.basename(recordPath.replace(/\\/gu, '/'));
  return basename.replace(/[^A-Za-z0-9._-]/gu, '_') || 'evidence';
};

export class EvidenceService {
  private readonly repo: EvidenceReadRepository;
  private readonly evidenceRoot: string;

  constructor(conn: DatabaseConnection, evidenceRoot: string) {
    this.repo = new EvidenceReadRepository(conn);
    this.evidenceRoot = path.resolve(evidenceRoot);
  }

  public getEvidenceMetadataByResultId(resultId: string) {
    const records = this.repo.getEvidenceByResultId(resultId);

    return {
      items: records.map((record) => {
        const availability = this.evaluateAvailability(record);
        return {
          evidenceId: record.evidence_id,
          resultId: record.result_id,
          type: record.type,
          fileName: toSafeFilename(record.path),
          mimeType: record.content_type,
          contentUrl: `/api/evidence/${record.evidence_id}/content`,
          available: availability.available,
          ...(availability.available ? {} : { unavailableReason: availability.reason }),
        };
      }),
    };
  }

  public getEvidenceStreamDescriptor(evidenceId: string): AvailableEvidence {
    const record = this.repo.getEvidenceById(evidenceId);
    if (!record) {
      throw new NotFoundError('EVIDENCE_NOT_FOUND', 'Evidence record not found.');
    }

    const availability = this.evaluateAvailability(record);
    if (availability.available) return availability;

    if (availability.reason === 'OUTSIDE_ROOT') throw new InvalidEvidencePathError();
    if (availability.reason === 'UNSUPPORTED_TYPE') throw new UnsupportedEvidenceTypeError();
    throw new NotFoundError('EVIDENCE_FILE_NOT_FOUND', 'Evidence file does not exist on disk.');
  }

  private evaluateAvailability(record: EvidenceRecord): EvidenceAvailability {
    const candidate = this.resolveCandidatePath(record.path);
    if (!candidate) return { available: false, reason: 'OUTSIDE_ROOT' };
    if (!fs.existsSync(candidate)) return { available: false, reason: 'FILE_MISSING' };

    let realEvidenceRoot: string;
    let realCandidate: string;
    let isRegularFile: boolean;
    try {
      realEvidenceRoot = fs.realpathSync(this.evidenceRoot);
      realCandidate = fs.realpathSync(candidate);
      isRegularFile = fs.statSync(realCandidate).isFile();
    } catch {
      return { available: false, reason: 'FILE_MISSING' };
    }

    if (!isContainedBy(realEvidenceRoot, realCandidate)) {
      return { available: false, reason: 'OUTSIDE_ROOT' };
    }
    if (!isRegularFile) {
      return { available: false, reason: 'FILE_MISSING' };
    }

    const suppliedExtension = path.extname(realCandidate).toLowerCase();
    const classification = classifyAttachment(realCandidate, record.content_type);
    if (
      !suppliedExtension ||
      classification?.extension !== suppliedExtension ||
      classification.role !== record.type
    ) {
      return { available: false, reason: 'UNSUPPORTED_TYPE' };
    }

    return {
      available: true,
      filePath: realCandidate,
      mimeType: classification.contentType,
      type: record.type,
      safeFilename: toSafeFilename(record.path),
    };
  }

  private resolveCandidatePath(recordPath: string): string | undefined {
    if (!recordPath || recordPath.includes('\0')) return undefined;

    const crossPlatformAbsolute =
      path.isAbsolute(recordPath) ||
      path.win32.isAbsolute(recordPath) ||
      path.posix.isAbsolute(recordPath);
    if (crossPlatformAbsolute && !path.isAbsolute(recordPath)) return undefined;

    const candidate = crossPlatformAbsolute
      ? path.resolve(recordPath)
      : path.resolve(this.evidenceRoot, recordPath);
    return isContainedBy(this.evidenceRoot, candidate) ? candidate : undefined;
  }
}
