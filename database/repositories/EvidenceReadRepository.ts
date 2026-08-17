import { DatabaseConnection } from '../sqlite';

export class EvidenceReadRepository {
  constructor(private conn: DatabaseConnection) {}

  public getEvidenceByResultId(resultId: string) {
    const { db } = this.conn;
    return db.prepare('SELECT evidence_id, result_id, type, path, content_type, created_at FROM test_evidence WHERE result_id = ? ORDER BY created_at ASC').all(resultId) as any[];
  }

  public getEvidenceById(evidenceId: string) {
    const { db } = this.conn;
    return db.prepare('SELECT evidence_id, result_id, type, path, content_type, created_at FROM test_evidence WHERE evidence_id = ?').get(evidenceId) as any | undefined;
  }
}
