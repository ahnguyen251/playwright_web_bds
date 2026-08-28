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

      // Error Info
      if (result.error_message) {
        const errorSection = document.createElement('div');
        errorSection.style.marginBottom = '24px';
        const errorLabel = document.createElement('strong');
        errorLabel.textContent = 'Thông Báo Lỗi:';
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
        const stackLabel = document.createElement('strong');
        stackLabel.textContent = 'Chi Tiết Lỗi (Stack Trace):';
        const stackPre = document.createElement('pre');
        stackPre.className = 'code-block';
        stackPre.textContent = result.error_stack;
        stackSection.appendChild(stackLabel);
        stackSection.appendChild(stackPre);
        this.body.appendChild(stackSection);
      }

      // Evidence Section
      const evSection = document.createElement('div');
      const evLabel = document.createElement('h3');
      evLabel.textContent = 'Bằng chứng';
      evSection.appendChild(evLabel);

      if (!evidenceData.items || evidenceData.items.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'Không tìm thấy tài liệu chứng cớ nào cho kết quả này.';
        p.style.color = 'var(--text-muted)';
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

    if (expectedFailure) labels.push('Expected failure');
    else if (unexpectedFailure) labels.push('Unexpected failure');
    if (actualFailure && result.traceability_status === 'MAPPED') {
      labels.push('Actual failed business execution');
    }

    if (labels.length === 0) return;
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.flexWrap = 'wrap';
    container.style.marginBottom = '24px';
    for (const text of labels) {
      const label = document.createElement('span');
      label.className = 'failure-classification';
      label.textContent = text;
      container.appendChild(label);
    }
    this.body.appendChild(container);
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
      detailButton.className = 'btn';
      detailButton.textContent = 'Xem chi tiết';
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
    link.className = 'btn';
    link.textContent = text;
    link.download = evidence.fileName;
    return link;
  }

  appendLogControls(item, evidence) {
    const actions = document.createElement('div');
    actions.className = 'evidence-actions';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'btn';
    viewButton.textContent = 'Xem nội dung';
    actions.appendChild(viewButton);
    actions.appendChild(this.createDownloadLink(evidence, 'Tải xuống'));

    const logContent = document.createElement('pre');
    logContent.className = 'code-block';
    logContent.hidden = true;
    let loadError;

    viewButton.addEventListener('click', async () => {
      if (logContent.dataset.loaded === 'true') {
        logContent.hidden = !logContent.hidden;
        viewButton.textContent = logContent.hidden ? 'Xem nội dung' : 'Ẩn nội dung';
        return;
      }

      viewButton.disabled = true;
      viewButton.textContent = 'Đang tải...';
      try {
        const response = await globalThis.fetch(evidence.contentUrl);
        if (!response.ok) throw new Error(`Không thể tải LOG (${response.status})`);

        logContent.textContent = await response.text();
        logContent.dataset.loaded = 'true';
        logContent.hidden = false;
        viewButton.textContent = 'Ẩn nội dung';
        loadError?.remove();
        loadError = undefined;
      } catch {
        if (!loadError) {
          loadError = this.createEvidenceError('Nội dung LOG không khả dụng');
          loadError.classList.add('evidence-load-error');
          actions.insertAdjacentElement('afterend', loadError);
        }
        viewButton.textContent = 'Xem lại';
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
