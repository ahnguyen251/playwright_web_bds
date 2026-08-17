import { api } from '../api.js';
import { Badge } from './Badge.js';
import { LoadingState } from './LoadingState.js';
import { ErrorState } from './ErrorState.js';

export class ResultDetailsModalClass {
  constructor() {
    this.createModalDOM();
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

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
        this.close();
      }
    });

    // Click outside
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  async open(resultId) {
    this.triggerElement = document.activeElement;
    this.overlay.style.display = 'flex';
    this.titleEl.textContent = 'Result Details';
    this.body.innerHTML = '';
    this.body.appendChild(LoadingState('Loading result details...'));
    this.modal.focus();

    try {
      const [result, evidenceData] = await Promise.all([
        api.getResultById(resultId),
        api.getResultEvidence(resultId)
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
      metaDiv.textContent = `Project: ${result.project_name || 'N/A'} | Traceability: ${result.traceability_status} | Duration: ${(result.duration_ms / 1000).toFixed(1)}s`;
      this.body.appendChild(metaDiv);

      // Error Info
      if (result.error_message) {
        const errorSection = document.createElement('div');
        errorSection.style.marginBottom = '24px';
        const errorLabel = document.createElement('strong');
        errorLabel.textContent = 'Error Message:';
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
        stackLabel.textContent = 'Stack Trace:';
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
      evLabel.textContent = 'Test Evidence';
      evSection.appendChild(evLabel);

      if (!evidenceData.items || evidenceData.items.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No evidence artifacts found for this result.';
        p.style.color = 'var(--text-muted)';
        evSection.appendChild(p);
      } else {
        const evGrid = document.createElement('div');
        evGrid.className = 'evidence-grid';

        evidenceData.items.forEach(ev => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'evidence-item';
          
          const label = document.createElement('div');
          label.textContent = `${ev.type} (${ev.fileName})`;
          label.style.marginBottom = '8px';
          label.style.fontSize = '0.9rem';
          itemDiv.appendChild(label);

          if (ev.type === 'SCREENSHOT') {
            const img = document.createElement('img');
            img.src = ev.contentUrl;
            img.alt = ev.fileName;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '4px';
            img.onerror = () => {
              img.replaceWith(this.createEvidenceError('Image unavailable'));
            };
            itemDiv.appendChild(img);
          } else if (ev.type === 'VIDEO') {
            const video = document.createElement('video');
            video.src = ev.contentUrl;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.borderRadius = '4px';
            video.onerror = () => {
              video.replaceWith(this.createEvidenceError('Video unavailable'));
            };
            itemDiv.appendChild(video);
          } else if (ev.type === 'TRACE') {
            const downloadBtn = document.createElement('a');
            downloadBtn.href = ev.contentUrl;
            downloadBtn.className = 'btn';
            downloadBtn.textContent = 'Download Trace (.zip)';
            downloadBtn.download = ev.fileName;
            itemDiv.appendChild(downloadBtn);
          } else {
            const p = document.createElement('p');
            p.textContent = 'Unsupported type preview';
            itemDiv.appendChild(p);
          }

          evGrid.appendChild(itemDiv);
        });

        evSection.appendChild(evGrid);
      }
      this.body.appendChild(evSection);

    } catch (err) {
      this.body.innerHTML = '';
      this.body.appendChild(ErrorState(err));
    }
  }

  createEvidenceError(message) {
    const p = document.createElement('p');
    p.textContent = message;
    p.style.color = 'var(--error)';
    p.style.fontStyle = 'italic';
    return p;
  }

  close() {
    this.overlay.style.display = 'none';
    if (this.triggerElement) {
      this.triggerElement.focus();
    }
  }
}

export const ResultDetailsModal = new ResultDetailsModalClass();
