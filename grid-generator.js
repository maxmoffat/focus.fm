(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getImg(images, preferred) {
    if (!Array.isArray(images)) return '';
    const order = [preferred, 'extralarge', 'large', 'medium', 'small'].filter(Boolean);
    for (const size of order) {
      const found = images.find(i => i.size === size);
      if (found && found['#text']) return found['#text'];
    }
    return '';
  }

  function fmtNum(n) {
    return Number(n).toLocaleString();
  }

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const picker      = document.getElementById('gg-date-picker');
  const dateBtn     = document.getElementById('gg-date-btn');
  const dateLabel   = document.getElementById('gg-date-label');
  const dateMenu    = document.getElementById('gg-date-menu');
  const sizePicker  = document.getElementById('gg-size-picker');
  const sizeBtn     = document.getElementById('gg-size-btn');
  const sizeLabel   = document.getElementById('gg-size-label');
  const sizeMenu    = document.getElementById('gg-size-menu');
  const albumChk    = document.getElementById('gg-album');
  const artistChk   = document.getElementById('gg-artist');
  const playsChk    = document.getElementById('gg-plays');
  const genBtn      = document.getElementById('gg-generate');
  const loaderEl    = document.getElementById('gg-loader');
  const resultEl    = document.getElementById('gg-result');
  const gridEl      = document.getElementById('gg-grid');
  const downloadBtn = document.getElementById('gg-download-btn');
  const downloadTxt = document.getElementById('gg-download-text');

  const DATE_LABELS = {
    week: 'Week', month: 'Month', '3m': '3 Months',
    '6m': '6 Months', '12m': '12 Months', all: 'All Time',
  };

  const username = sessionStorage.getItem('lfm_username');

  // ── User avatar ──────────────────────────────────────────────────────────

  if (username) {
    LastFM.getUserInfo(username).then(data => {
      const img     = data.user?.image;
      const avatarEl = document.getElementById('user-avatar');
      if (avatarEl && Array.isArray(img)) {
        const found = img.find(i => i.size === 'medium' && i['#text']);
        if (found) {
          avatarEl.style.backgroundImage    = `url('${found['#text']}')`;
          avatarEl.style.backgroundSize     = 'cover';
          avatarEl.style.backgroundPosition = 'center';
          avatarEl.textContent = '';
        }
      }
    }).catch(() => {});
  }

  // ── Date picker ──────────────────────────────────────────────────────────

  let currentPeriod = 'month';

  dateBtn.addEventListener('click', e => {
    e.stopPropagation();
    picker.classList.toggle('open');
  });

  dateMenu.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const val = li.dataset.value;
    dateMenu.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    dateLabel.textContent = DATE_LABELS[val] || li.textContent;
    picker.classList.remove('open');
    currentPeriod = val;
  });

  document.addEventListener('click', e => {
    if (!picker.contains(e.target))     picker.classList.remove('open');
    if (!sizePicker.contains(e.target)) sizePicker.classList.remove('open');
  });

  // ── Size picker ───────────────────────────────────────────────────────────

  let currentSize = 3;

  sizeBtn.addEventListener('click', e => {
    e.stopPropagation();
    sizePicker.classList.toggle('open');
  });

  sizeMenu.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const val = parseInt(li.dataset.value, 10);
    sizeMenu.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    sizeLabel.textContent = li.textContent;
    sizePicker.classList.remove('open');
    currentSize = val;
  });

  // ── State ─────────────────────────────────────────────────────────────────

  let currentAlbums = [];
  let isGenerating  = false;

  // ── Generate ──────────────────────────────────────────────────────────────

  genBtn.addEventListener('click', generate);

  async function generate() {
    if (isGenerating) return;
    isGenerating    = true;
    genBtn.disabled = true;

    loaderEl.hidden = false;
    resultEl.hidden = true;
    loaderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const count = currentSize * currentSize;
      const data  = await LastFM.getTopAlbums(username, currentPeriod, count);
      const raw   = data.topalbums?.album;
      currentAlbums = Array.isArray(raw) ? raw : raw ? [raw] : [];
      renderGrid();
      resultEl.hidden = false;
    } catch {
      // leave result hidden on error
    } finally {
      isGenerating    = false;
      genBtn.disabled = false;
      loaderEl.hidden = true;
    }
  }

  // ── Render grid ───────────────────────────────────────────────────────────

  function renderGrid() {
    const N          = currentSize;
    const showAlbum  = albumChk.checked;
    const showArtist = artistChk.checked;
    const showPlays  = playsChk.checked;

    gridEl.style.setProperty('--gg-cols', N);
    gridEl.innerHTML = '';

    for (let i = 0; i < N * N; i++) {
      const album = currentAlbums[i];
      const cell  = document.createElement('div');
      cell.className = 'gg-cell';

      if (album) {
        const img = getImg(album.image, 'extralarge');
        if (img) {
          cell.style.backgroundImage = `url('${esc(img)}')`;
          cell.dataset.imgUrl = img;
        }
        cell.dataset.album  = album.name         || '';
        cell.dataset.artist = album.artist?.name || '';
        cell.dataset.plays  = album.playcount    || '0';

        if (showAlbum || showArtist || showPlays) {
          const labelEl = document.createElement('div');
          labelEl.className = 'gg-cell-label';

          if (showAlbum) {
            const p = document.createElement('p');
            p.className   = 'gg-cell-album';
            p.textContent = album.name || '';
            labelEl.appendChild(p);
          }
          if (showArtist) {
            const p = document.createElement('p');
            p.className   = 'gg-cell-artist';
            p.textContent = album.artist?.name || '';
            labelEl.appendChild(p);
          }
          if (showPlays) {
            const p = document.createElement('p');
            p.className   = 'gg-cell-plays';
            p.textContent = `Plays: ${fmtNum(album.playcount || 0)}`;
            labelEl.appendChild(p);
          }

          cell.appendChild(labelEl);
        }
      }

      gridEl.appendChild(cell);
    }
  }

  // ── Download via canvas ───────────────────────────────────────────────────

  downloadBtn.addEventListener('click', downloadGrid);

  async function downloadGrid() {
    const N      = currentSize;
    const cellPx = 300;

    downloadBtn.disabled  = true;
    downloadTxt.textContent = 'Preparing…';

    const canvas  = document.createElement('canvas');
    canvas.width  = cellPx * N;
    canvas.height = cellPx * N;
    const ctx = canvas.getContext('2d');

    const showAlbum  = albumChk.checked;
    const showArtist = artistChk.checked;
    const showPlays  = playsChk.checked;

    const cells = Array.from(gridEl.querySelectorAll('.gg-cell'));

    // Draw all gray backgrounds synchronously first
    cells.forEach((_, idx) => {
      const x = (idx % N) * cellPx;
      const y = Math.floor(idx / N) * cellPx;
      ctx.fillStyle = '#e2e2e2';
      ctx.fillRect(x, y, cellPx, cellPx);
    });

    // Load and draw each image (concurrent)
    const draws = cells.map((cell, idx) => new Promise(resolve => {
      const x      = (idx % N) * cellPx;
      const y      = Math.floor(idx / N) * cellPx;
      const imgUrl = cell.dataset.imgUrl;

      if (!imgUrl) { resolve(); return; }

      const img      = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Cover-fit into square cell
        const scale = Math.max(cellPx / img.width, cellPx / img.height);
        const sw    = cellPx / scale;
        const sh    = cellPx / scale;
        const sx    = (img.width  - sw) / 2;
        const sy    = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cellPx, cellPx);

        drawCellOverlay(ctx, x, y, cellPx, cell.dataset, showAlbum, showArtist, showPlays);
        resolve();
      };

      img.onerror = () => resolve();
      img.src = imgUrl;
    }));

    await Promise.all(draws);

    try {
      canvas.toBlob(blob => {
        if (!blob) { resetDownload(); return; }
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        const d    = new Date();
        const ds   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        a.href     = url;
        a.download = `focus-fm-grid-${ds}.png`;
        a.click();
        URL.revokeObjectURL(url);
        resetDownload();
      }, 'image/png');
    } catch {
      resetDownload();
    }
  }

  function resetDownload() {
    downloadBtn.disabled    = false;
    downloadTxt.textContent = 'Download Image';
  }

  // ── Canvas overlay helpers ────────────────────────────────────────────────

  function drawCellOverlay(ctx, x, y, cellPx, dataset, showAlbum, showArtist, showPlays) {
    const lines = [];
    if (showAlbum  && dataset.album)  lines.push({ text: dataset.album,  bold: true  });
    if (showArtist && dataset.artist) lines.push({ text: dataset.artist, bold: false });
    if (showPlays  && dataset.plays)  lines.push({ text: `Plays: ${Number(dataset.plays).toLocaleString()}`, bold: false });
    if (!lines.length) return;

    const fontSize = 14;
    const lineH    = 18;
    const padX     = 8;
    const padY     = 6;
    const margin   = 8;
    const maxTextW = cellPx - margin * 2 - padX * 2;

    // Measure widest line
    let textMaxW = 0;
    lines.forEach(l => {
      ctx.font = `${l.bold ? 'bold' : 'normal'} ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      textMaxW = Math.max(textMaxW, Math.min(ctx.measureText(l.text).width, maxTextW));
    });

    const boxW = textMaxW + padX * 2;
    const boxH = lines.length * lineH + padY * 2;
    const boxX = x + margin;
    const boxY = y + margin;

    ctx.fillStyle = 'rgba(34,34,34,0.75)';
    fillRoundRect(ctx, boxX, boxY, boxW, boxH, 4);

    ctx.fillStyle = '#ffffff';
    lines.forEach((l, i) => {
      ctx.font = `${l.bold ? 'bold' : 'normal'} ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      const text = truncateText(ctx, l.text, maxTextW);
      ctx.fillText(text, boxX + padX, boxY + padY + i * lineH + lineH - 4);
    });
  }

  function fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function truncateText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '…').width > maxW) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

})();
