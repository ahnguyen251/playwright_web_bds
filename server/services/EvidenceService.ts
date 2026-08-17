import path from 'path';
import fs from 'fs';
import { DatabaseConnection, getDefaultDatabase } from '../../database/sqlite';
import { EvidenceReadRepository } from '../../database/repositories/EvidenceReadRepository';
import { NotFoundError, BadRequestError } from '../utils/errors';

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

export class EvidenceService {
  private repo: EvidenceReadRepository;
  private evidenceRoot: string;

  constructor(conn?: DatabaseConnection, evidenceRoot?: string) {
    const db = conn || getDefaultDatabase();
    this.repo = new EvidenceReadRepository(db);
    this.evidenceRoot = evidenceRoot || path.resolve(process.cwd(), 'test-results');
  }

  public getEvidenceMetadataByResultId(resultId: string) {
    const records = this.repo.getEvidenceByResultId(resultId);
    
    return {
      items: records.map(record => ({
        evidenceId: record.evidence_id,
        resultId: record.result_id,
        type: record.type,
        fileName: path.basename(record.path),
        mimeType: record.content_type,
        // Omit physical path, absolute path, etc.
        contentUrl: `/api/evidence/${record.evidence_id}/content`
      }))
    };
  }

  public getEvidenceStreamDescriptor(evidenceId: string) {
    const record = this.repo.getEvidenceById(evidenceId);
    if (!record) {
      throw new NotFoundError('EVIDENCE_NOT_FOUND', 'Evidence record not found.');
    }

    // Path traversal protection
    const resolvedPath = path.resolve(process.cwd(), record.path);
    const relativePath = path.relative(this.evidenceRoot, resolvedPath);

    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    // Also explicitly block Windows drive paths or UNC if it resolves outside, but path.resolve handles that.
    // Ensure no escape happened
    if (isOutside) {
      throw new InvalidEvidencePathError();
    }

    // Check physical existence
    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundError('EVIDENCE_FILE_NOT_FOUND', 'Evidence file does not exist on disk.');
    }

    // Type and MIME validation combination allowlist
    const isValid = this.validateMimeType(record.type, record.content_type, resolvedPath);
    if (!isValid) {
      throw new UnsupportedEvidenceTypeError();
    }

    // Sanitized filename for Content-Disposition
    const safeFilename = path.basename(resolvedPath).replace(/[\r\n]/g, '');

    return {
      filePath: resolvedPath,
      mimeType: record.content_type,
      type: record.type,
      safeFilename
    };
  }

  private validateMimeType(type: string, mimeType: string, filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();

    if (type === 'SCREENSHOT') {
      return (mimeType === 'image/png' || mimeType === 'image/jpeg') && (ext === '.png' || ext === '.jpg' || ext === '.jpeg');
    }
    if (type === 'VIDEO') {
      return mimeType === 'video/webm' && ext === '.webm';
    }
    if (type === 'TRACE') {
      return mimeType === 'application/zip' && ext === '.zip';
    }
    return false;
  }
}
