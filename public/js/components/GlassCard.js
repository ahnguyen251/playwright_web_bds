/**
 * GlassCard Component - Nexora Modern Design Style
 * Elegant floating frosted glass feature card with squircle icon, bold heading,
 * descriptive text, and animated action link ("Learn more →").
 */
export function GlassCard({
  iconSvg = '',
  colorScheme = 'blue',
  title = '',
  description = '',
  linkText = 'Xem chi tiết →',
  linkHref = '#',
  onClick = null,
  badge = null
} = {}) {
  const card = document.createElement('div');
  card.className = 'nexora-feature-card';

  // Icon Header
  const iconWrap = document.createElement('div');
  iconWrap.className = `nexora-icon-box ${colorScheme}`;
  if (iconSvg) {
    iconWrap.innerHTML = iconSvg;
  } else {
    iconWrap.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    `;
  }
  card.appendChild(iconWrap);

  // Optional badge
  if (badge) {
    const badgeEl = document.createElement('span');
    badgeEl.className = 'nexora-card-badge';
    badgeEl.textContent = badge;
    card.appendChild(badgeEl);
  }

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'nexora-card-title';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  // Description
  const descEl = document.createElement('p');
  descEl.className = 'nexora-card-desc';
  descEl.textContent = description;
  card.appendChild(descEl);

  // Action link
  if (linkText) {
    const linkEl = document.createElement('a');
    linkEl.className = 'nexora-card-link';
    linkEl.href = linkHref;
    linkEl.innerHTML = `<span>${linkText}</span>`;
    
    if (onClick) {
      linkEl.addEventListener('click', (e) => {
        e.preventDefault();
        onClick(e);
      });
    }
    card.appendChild(linkEl);
  }

  return card;
}

