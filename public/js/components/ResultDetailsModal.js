/* global document */

import { api } from '../api.js';
import { Badge } from './Badge.js';
import { LoadingState } from './LoadingState.js';
import { ErrorState } from './ErrorState.js';

let singletonInstance = null;

const evidencePriority = Object.freeze({
  SCREENSHOT: 1,
  VIDEO: 2,
  TRACE: 3,
  LOG: 4,
  OTHER: 5,
});

const normalizeStatus = (status) =>
  String(status || '')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

export class ResultDetailsModalClass {
  constructor() {
    if (singletonInstance) {
      return singletonInstance;
    }
    this.createModalDOM();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- cache the DOM-backed singleton
    singletonInstance = this;
  }

  createModalDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.display = 'none';

    this.modal = document.createElement('div');
    this.modal.className = 'modal-content';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'modal-title');
    this.modal.tabIndex = -1;

    this.header = document.createElement('div');
    this.header.className = 'modal-header';

    this.titleEl = document.createElement('h2');
    this.titleEl.id = 'modal-title';

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'btn modal-close';
    this.closeBtn.innerHTML = '&times;';
    this.closeBtn.onclick = () => this.close();

    this.header.appendChild(this.titleEl);
    this.header.appendChild(this.closeBtn);

    this.body = document.createElement('div');
    this.body.className = 'modal-body';

    this.modal.appendChild(this.header);
    this.modal.appendChild(this.body);
    this.overlay.appendChild(this.modal);

    document.body.appendChild(this.overlay);
    this.createImagePreviewDOM();

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.imagePreview.style.display === 'flex') {
        e.preventDefault();
        this.closeImagePreview();
      } else if (this.overlay.style.display === 'flex') this.close();
    });

    // Click outside
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  createImagePreviewDOM() {
    this.imagePreview = document.createElement('div');
    this.imagePreview.className = 'evidence-image-preview';
    this.imagePreview.style.display = 'none';
    this.imagePreview.setAttribute('role', 'dialog');
    this.imagePreview.setAttribute('aria-modal', 'true');
    this.imagePreview.setAttribute('aria-labelledby', 'evidence-image-preview-title');

    const panel = document.createElement('div');
    panel.className = 'evidence-image-preview-panel';

    const header = document.createElement('div');
    header.className = 'evidence-image-preview-header';

    const title = document.createElement('h3');
    title.id = 'evidence-image-preview-title';
    title.textContent = 'Xem ảnh chi tiết';

    this.imagePreviewClose = document.createElement('button');
    this.imagePreviewClose.type = 'button';
    this.imagePreviewClose.className = 'btn modal-close';
    this.imagePreviewClose.setAttribute('aria-label', 'Đóng ảnh chi tiết');
    this.imagePreviewClose.textContent = '×';
    this.imagePreviewClose.addEventListener('click', () => this.closeImagePreview());

    this.imagePreviewImage = document.createElement('img');
    this.imagePreviewImage.className = 'evidence-image-preview-content';

    this.imagePreviewCaption = document.createElement('p');
    this.imagePreviewCaption.className = 'evidence-image-preview-caption';

    header.appendChild(title);
    header.appendChild(this.imagePreviewClose);
    panel.appendChild(header);
    panel.appendChild(this.imagePreviewImage);
    panel.appendChild(this.imagePreviewCaption);
    this.imagePreview.appendChild(panel);
    document.body.appendChild(this.imagePreview);

    this.imagePreview.addEventListener('click', (event) => {
      if (event.target === this.imagePreview) this.closeImagePreview();
    });
  }

  async open(resultId) {
    this.closeImagePreview({ restoreFocus: false });
    this.triggerElement = document.activeElement;
    this.overlay.style.display = 'flex';
    this.titleEl.textContent = 'Chi Tiết Kết Quả';
    this.body.innerHTML = '';
    this.body.appendChild(LoadingState('Đang tải chi tiết kết quả...'));
    this.modal.focus();

    try {
      const [result, evidenceData] = await Promise.all([
        api.getResultById(resultId),
        api.getResultEvidence(resultId),
      ]);

      this.body.innerHTML = '';

      const titleWrap = document.createElement('div');
      titleWrap.style.marginBottom = '16px';

      const badge = Badge(result.status, result.status);
      badge.style.marginRight = '8px';
      titleWrap.appendChild(badge);

      const testTitle = document.createElement('span');
      testTitle.style.fontWeight = 'bold';
      testTitle.textContent = result.title;
      titleWrap.appendChild(testTitle);

      this.body.appendChild(titleWrap);

      // Meta info
      const metaDiv = document.createElement('div');
      metaDiv.style.marginBottom = '24px';
      metaDiv.style.fontSize = '0.9rem';
      metaDiv.style.color = 'var(--text-muted)';
      metaDiv.textContent = `Dự Án: ${result.project_name || 'N/A'} | Truy vết: ${result.traceability_status} | Thời Gian: ${(result.duration_ms / 1000).toFixed(1)}s`;
      this.body.appendChild(metaDiv);
      this.appendFailureClassifications(result);
      this.appendExpectedVsActualSection(result);

      // Error Info
      if (result.error_message) {
        const errorSection = document.createElement('div');
        errorSection.style.marginBottom = '24px';
        const errorLabel = document.createElement('div');
        errorLabel.className = 'modal-section-title';
        errorLabel.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${result.status === 'SKIPPED' ? 'Lý Do Bỏ Qua (Skip Reason):' : 'Thông Báo Lỗi:'}</span>
        `;
        const errorPre = document.createElement('pre');
        errorPre.className = 'code-block';
        errorPre.textContent = result.error_message;
        errorSection.appendChild(errorLabel);
        errorSection.appendChild(errorPre);
        this.body.appendChild(errorSection);
      }

      if (result.error_stack) {
        const stackSection = document.createElement('div');
        stackSection.style.marginBottom = '24px';
        const stackLabel = document.createElement('div');
        stackLabel.className = 'modal-section-title';
        stackLabel.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>Chi Tiết Lỗi (Stack Trace):</span>
        `;
        const stackPre = document.createElement('pre');
        stackPre.className = 'code-block';
        stackPre.textContent = result.error_stack;
        stackSection.appendChild(stackLabel);
        stackSection.appendChild(stackPre);
        this.body.appendChild(stackSection);
      }

      // Evidence Section
      const evSection = document.createElement('div');
      const evLabel = document.createElement('div');
      evLabel.className = 'modal-section-title';
      evLabel.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>Bằng chứng</span>
      `;
      evSection.appendChild(evLabel);

      if (!evidenceData.items || evidenceData.items.length === 0) {
        const p = document.createElement('p');
        if (result.status === 'PASSED') {
          p.textContent = 'Kiểm thử thực thi thành công (PASSED). Không phát sinh lỗi hay cảnh báo.';
          p.style.color = '#10b981';
          p.style.fontWeight = '500';
        } else {
          p.textContent = 'Không tìm thấy tài liệu chứng cớ nào cho kết quả này.';
          p.style.color = 'var(--text-muted)';
        }
        evSection.appendChild(p);
      } else {
        const sortedEvidence = [...evidenceData.items].sort(
          (left, right) =>
            (evidencePriority[left.type] || evidencePriority.OTHER) -
            (evidencePriority[right.type] || evidencePriority.OTHER),
        );
        const primaryEvidence = sortedEvidence.filter((ev) =>
          ['SCREENSHOT', 'VIDEO', 'TRACE'].includes(ev.type),
        );
        const supplementaryEvidence = sortedEvidence.filter(
          (ev) => !['SCREENSHOT', 'VIDEO', 'TRACE'].includes(ev.type),
        );
        this.appendEvidenceGroup(
          evSection,
          'Bằng chứng chính',
          'evidence-primary',
          primaryEvidence,
        );
        this.appendEvidenceGroup(
          evSection,
          'Bằng chứng bổ sung',
          'evidence-supplementary',
          supplementaryEvidence,
        );
      }
      this.body.appendChild(evSection);
    } catch (err) {
      this.body.innerHTML = '';
      this.body.appendChild(ErrorState(err));
    }
  }

  appendFailureClassifications(result) {
    const actualStatus = normalizeStatus(result.status);
    const expectedStatus = normalizeStatus(result.expected_status);
    const actualFailure = ['failed', 'timedout', 'interrupted'].includes(actualStatus);
    const expectedFailure = actualStatus === 'failed' && expectedStatus === 'failed';
    const unexpectedFailure =
      Boolean(expectedStatus) && actualStatus !== 'skipped' && actualStatus !== expectedStatus;
    const labels = [];

    if (expectedFailure) {
      labels.push({
        text: '🏷️ Lỗi sản phẩm đã ghi nhận (Known Product Gap / test.fail)',
        className: 'badge-known-gap',
      });
    } else if (unexpectedFailure) {
      labels.push({
        text: '🚨 Lỗi phát sinh ngoài dự kiến (Defect / Regression)',
        className: 'badge-defect',
      });
    }

    if (actualFailure && result.traceability_status === 'MAPPED') {
      labels.push({
        text: '📋 Kịch bản nghiệp vụ chuẩn (MAPPED)',
        className: 'badge-mapped-failure',
      });
    }

    if (labels.length === 0) return;
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.flexWrap = 'wrap';
    container.style.marginBottom = '20px';
    for (const item of labels) {
      const label = document.createElement('span');
      label.className = `failure-classification ${item.className}`;
      label.textContent = item.text;
      container.appendChild(label);
    }
    this.body.appendChild(container);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  parseAssertionDiff(errorMessage) {
    if (!errorMessage) return null;

    // Pattern 1: Expected: ... Received: ...
    const expectedMatch = errorMessage.match(/Expected(?: [a-z]+)?:\s*([^\r\n]+(?:\r?\n(?!(?:Received|at |\s*$))[^\r\n]+)*)/i);
    const receivedMatch = errorMessage.match(/Received(?: [a-z]+)?:\s*([^\r\n]+(?:\r?\n(?!(?:at |\s*$))[^\r\n]+)*)/i);

    if (expectedMatch && receivedMatch) {
      return {
        expected: expectedMatch[1].trim(),
        received: receivedMatch[1].trim(),
        type: 'ASSERTION',
      };
    }

    // Pattern 2: Timed out waiting for ...
    const timeoutMatch = errorMessage.match(/Timed?\s*out\s*(\d+ms)?\s*waiting\s*for\s*([^.]+)/i) ||
      errorMessage.match(/Timeout\s*(\d+ms)?\s*exceeded/i);
    if (timeoutMatch) {
      return {
        expected: 'Phần tử/trạng thái trang hiển thị sẵn sàng trong thời gian cho phép',
        received: `Quá thời gian chờ (${timeoutMatch[1] || 'Timeout'}). ${timeoutMatch[2] ? 'Không thể hoàn tất: ' + timeoutMatch[2].trim() : 'Phần tử không phản hồi kịp thời.'}`,
        type: 'TIMEOUT',
      };
    }

    return null;
  }

  appendExpectedVsActualSection(result) {
    const isFailed = ['FAILED', 'TIMED_OUT', 'ERROR'].includes(result.status);
    const hasExpected = Boolean(result.expected_result);
    const diff = this.parseAssertionDiff(result.error_message);

    if (!isFailed && !hasExpected) return;

    const section = document.createElement('div');
    section.className = 'result-comparison-card';

    // Left Column: EXPECTED
    const expectedCol = document.createElement('div');
    expectedCol.className = 'comparison-column comparison-expected';
    expectedCol.innerHTML = `
      <div class="comparison-header">
        <div class="comparison-icon-badge">
          <svg class="comparison-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <span class="comparison-title">KẾT QUẢ MONG MUỐN (EXPECTED)</span>
      </div>
      <div class="comparison-body">
        ${result.expected_result ? `
          <div class="comparison-item">
            <span class="comparison-item-label">Nghiệp vụ kịch bản:</span>
            <div class="comparison-item-val business-spec">${this.escapeHtml(result.expected_result)}</div>
          </div>
        ` : ''}
        ${diff?.expected ? `
          <div class="comparison-item">
            <span class="comparison-item-label">Kỳ vọng kiểm thử (Assertion):</span>
            <div class="comparison-item-val code-val">${this.escapeHtml(diff.expected)}</div>
          </div>
        ` : ''}
        ${!result.expected_result && !diff?.expected ? `
          <div class="comparison-item">
            <span class="comparison-item-label">Mô tả kỳ vọng:</span>
            <div class="comparison-item-val business-spec">Toàn bộ các bước kiểm thử và xác thực phải vượt qua thành công (PASSED).</div>
          </div>
        ` : ''}
      </div>
    `;

    // Right Column: ACTUAL
    const actualCol = document.createElement('div');
    actualCol.className = `comparison-column ${isFailed ? 'comparison-actual-failed' : 'comparison-actual-passed'}`;

    if (isFailed) {
      actualCol.innerHTML = `
        <div class="comparison-header">
          <div class="comparison-icon-badge">
            <svg class="comparison-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <span class="comparison-title">KẾT QUẢ THỰC TẾ (ACTUAL)</span>
        </div>
        <div class="comparison-body">
          <div class="comparison-item">
            <span class="comparison-item-label">${diff?.type === 'TIMEOUT' ? 'Hiện tượng thực tế:' : 'Thực tế nhận được:'}</span>
            <div class="comparison-item-val error-val">${this.escapeHtml(diff?.received || result.error_message?.split('\n')[0] || 'Kiểm thử không thỏa mãn điều kiện mong muốn')}</div>
          </div>
          <div class="comparison-item">
            <span class="comparison-item-label">Đánh giá:</span>
            <div class="comparison-item-val status-val">
              <span class="badge-status-failed">✕ FAILED (Không đạt yêu cầu)</span>
            </div>
          </div>
        </div>
      `;
    } else {
      actualCol.innerHTML = `
        <div class="comparison-header">
          <div class="comparison-icon-badge">
            <svg class="comparison-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <span class="comparison-title">KẾT QUẢ THỰC TẾ (ACTUAL)</span>
        </div>
        <div class="comparison-body">
          <div class="comparison-item">
            <span class="comparison-item-label">Thực tế hệ thống:</span>
            <div class="comparison-item-val success-val">Hệ thống đã phản hồi đúng và đáp ứng trọn vẹn kết quả mong muốn.</div>
          </div>
          <div class="comparison-item">
            <span class="comparison-item-label">Đánh giá:</span>
            <div class="comparison-item-val status-val">
              <span class="badge-status-passed">✓ PASSED (Đạt yêu cầu)</span>
            </div>
          </div>
        </div>
      `;
    }

    section.appendChild(expectedCol);
    section.appendChild(actualCol);
    this.body.appendChild(section);
  }


  appendEvidenceGroup(parent, title, className, evidenceItems) {
    if (evidenceItems.length === 0) return;

    const heading = document.createElement('h4');
    heading.textContent = title;
    parent.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = `evidence-grid ${className}`;
    for (const evidence of evidenceItems) {
      grid.appendChild(this.createEvidenceItem(evidence));
    }
    parent.appendChild(grid);
  }

  createEvidenceItem(evidence) {
    const item = document.createElement('div');
    item.className = 'evidence-item';

    const label = document.createElement('div');
    label.className = 'evidence-label';
    label.textContent = `${evidence.type} (${evidence.fileName})`;
    label.style.marginBottom = '8px';
    label.style.fontSize = '0.9rem';
    item.appendChild(label);

    if (evidence.available === false) {
      const disabledActions =
        evidence.type === 'LOG'
          ? ['Xem nội dung', 'Tải xuống']
          : evidence.type === 'TRACE'
            ? ['Tải Xuống Trace (.zip)']
            : evidence.type === 'OTHER'
              ? ['Tải xuống']
              : [];
      if (disabledActions.length > 0) {
        const actions = document.createElement('div');
        for (const text of disabledActions) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn';
          button.textContent = text;
          button.disabled = true;
          actions.appendChild(button);
        }
        item.appendChild(actions);
      }
      const message = this.createEvidenceError(
        `Bằng chứng không khả dụng (${evidence.unavailableReason || 'UNKNOWN'})`,
      );
      message.classList.add('evidence-unavailable');
      item.appendChild(message);
      return item;
    }

    if (evidence.type === 'SCREENSHOT') {
      const thumbnailButton = document.createElement('button');
      thumbnailButton.type = 'button';
      thumbnailButton.className = 'evidence-thumbnail-button';
      thumbnailButton.setAttribute('aria-label', `Xem chi tiết ảnh ${evidence.fileName}`);
      thumbnailButton.title = 'Xem chi tiết';

      const image = document.createElement('img');
      image.src = evidence.contentUrl;
      image.alt = evidence.fileName;
      const openFromThumbnail = () => this.openImagePreview(evidence, thumbnailButton);
      thumbnailButton.addEventListener('click', openFromThumbnail);

      const actions = document.createElement('div');
      actions.className = 'evidence-actions';
      const detailButton = document.createElement('button');
      detailButton.type = 'button';
      detailButton.className = 'btn-evidence-view';
      detailButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>Xem chi tiết</span>
      `;
      detailButton.addEventListener('click', () => this.openImagePreview(evidence, detailButton));
      actions.appendChild(detailButton);

      image.onerror = () => {
        thumbnailButton.replaceWith(this.createEvidenceError('Hình ảnh không khả dụng'));
        detailButton.disabled = true;
      };
      thumbnailButton.appendChild(image);
      item.appendChild(thumbnailButton);
      item.appendChild(actions);
    } else if (evidence.type === 'VIDEO') {
      const video = document.createElement('video');
      video.src = evidence.contentUrl;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.borderRadius = '4px';
      video.onerror = () => {
        video.replaceWith(this.createEvidenceError('Video không khả dụng'));
      };
      item.appendChild(video);
    } else if (evidence.type === 'TRACE') {
      item.appendChild(this.createDownloadLink(evidence, 'Tải Xuống Trace (.zip)'));
    } else if (evidence.type === 'LOG') {
      this.appendLogControls(item, evidence);
    } else if (evidence.type === 'OTHER') {
      item.appendChild(this.createDownloadLink(evidence, 'Tải xuống'));
    } else {
      const message = document.createElement('p');
      message.textContent = 'Loại xem trước không được hỗ trợ';
      item.appendChild(message);
    }

    return item;
  }

  createDownloadLink(evidence, text) {
    const link = document.createElement('a');
    link.href = evidence.contentUrl;
    link.className = 'btn-evidence-download';
    link.download = evidence.fileName;
    link.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>${text}</span>
    `;
    return link;
  }

  appendLogControls(item, evidence) {
    const actions = document.createElement('div');
    actions.className = 'evidence-actions';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'btn-evidence-view';
    viewButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span class="btn-text">Xem nội dung</span>
    `;
    actions.appendChild(viewButton);
    actions.appendChild(this.createDownloadLink(evidence, 'Tải xuống'));

    const logContent = document.createElement('pre');
    logContent.className = 'code-block';
    logContent.hidden = true;
    let loadError;

    const setViewBtnText = (txt) => {
      const span = viewButton.querySelector('.btn-text');
      if (span) span.textContent = txt;
    };

    viewButton.addEventListener('click', async () => {
      if (logContent.dataset.loaded === 'true') {
        logContent.hidden = !logContent.hidden;
        setViewBtnText(logContent.hidden ? 'Xem nội dung' : 'Ẩn nội dung');
        return;
      }

      viewButton.disabled = true;
      setViewBtnText('Đang tải...');
      try {
        const response = await globalThis.fetch(evidence.contentUrl);
        if (!response.ok) throw new Error(`Không thể tải LOG (${response.status})`);

        logContent.textContent = await response.text();
        logContent.dataset.loaded = 'true';
        logContent.hidden = false;
        setViewBtnText('Ẩn nội dung');
        loadError?.remove();
        loadError = undefined;
      } catch {
        if (!loadError) {
          loadError = this.createEvidenceError('Nội dung LOG không khả dụng');
          loadError.classList.add('evidence-load-error');
          actions.insertAdjacentElement('afterend', loadError);
        }
        setViewBtnText('Xem lại');
      } finally {
        viewButton.disabled = false;
      }
    });

    item.appendChild(actions);
    item.appendChild(logContent);
  }

  openImagePreview(evidence, trigger) {
    this.imagePreviewTrigger = trigger;
    this.imagePreviewImage.src = evidence.contentUrl;
    this.imagePreviewImage.alt = evidence.fileName;
    this.imagePreviewCaption.textContent = evidence.fileName;
    this.imagePreview.style.display = 'flex';
    this.imagePreviewClose.focus();
  }

  closeImagePreview({ restoreFocus = true } = {}) {
    if (!this.imagePreview || this.imagePreview.style.display === 'none') return;
    this.imagePreview.style.display = 'none';
    this.imagePreviewImage.removeAttribute('src');
    this.imagePreviewImage.alt = '';
    this.imagePreviewCaption.textContent = '';
    if (restoreFocus && this.imagePreviewTrigger) this.imagePreviewTrigger.focus();
    this.imagePreviewTrigger = undefined;
  }

  createEvidenceError(message) {
    const p = document.createElement('p');
    p.textContent = message;
    p.style.color = 'var(--error)';
    p.style.fontStyle = 'italic';
    return p;
  }

  close() {
    this.closeImagePreview({ restoreFocus: false });
    this.overlay.style.display = 'none';
    if (this.triggerElement) {
      this.triggerElement.focus();
    }
  }
}

export const ResultDetailsModal = new ResultDetailsModalClass();
