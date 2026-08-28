import type { DatabaseConnection } from '../sqlite';

export interface EvidenceRecord {
  readonly evidence_id: string;
  readonly result_id: string;
  readonly type: string;
  readonly path: string;
  readonly content_type: string;
  readonly created_at: string;
}

export class EvidenceReadRepository {
  constructor(private conn: DatabaseConnection) {}

  public getEvidenceByResultId(resultId: string): EvidenceRecord[] {
    const { db } = this.conn;
    return db
      .prepare(
        'SELECT evidence_id, result_id, type, path, content_type, created_at FROM test_evidence WHERE result_id = ? ORDER BY created_at ASC',
      )
      .all(resultId) as EvidenceRecord[];
  }

  public getEvidenceById(evidenceId: string): EvidenceRecord | undefined {
    const { db } = this.conn;
    return db
      .prepare(
        'SELECT evidence_id, result_id, type, path, content_type, created_at FROM test_evidence WHERE evidence_id = ?',
      )
      .get(evidenceId) as EvidenceRecord | undefined;
  }
}
