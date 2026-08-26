(function () {
  const picker = document.getElementById('kanjiPicker');
  const gradeFilter = document.getElementById('gradeFilter');
  const searchBox = document.getElementById('searchBox');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const selectedCount = document.getElementById('selectedCount');
  const selectedChips = document.getElementById('selectedChips');
  const pasteBox = document.getElementById('pasteBox');
  const pasteAddBtn = document.getElementById('pasteAddBtn');
  const pasteRemoveBtn = document.getElementById('pasteRemoveBtn');
  const rangeModeBtn = document.getElementById('rangeModeBtn');
  const sortMode = document.getElementById('sortMode');
  const generateBtn = document.getElementById('generateBtn');
  const printBtn = document.getElementById('printBtn');
  const worksheet = document.getElementById('worksheet');

  const STORAGE_KEY = 'kanjiTestGenerator.selectedKanji';

  const selected = new Set();
  let currentGrade = 'all';
  let flatEntries = [];
  let lastClickedIndex = null;
  let rangeMode = false;
  let rangeAnchorIndex = null;

  function loadSelection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      arr.forEach(k => {
        if (KANJI_DATA.some(entry => entry.kanji === k)) selected.add(k);
      });
    } catch (e) {
      // localStorageが使えない/壊れている場合は無視して未選択状態から始める
    }
  }

  function saveSelection() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)));
    } catch (e) {
      // プライベートブラウジング等で保存できない場合は諦める
    }
  }

  function matchesSearch(entry, query) {
    if (!query) return true;
    if (entry.kanji.includes(query)) return true;
    return entry.words.some(w => w.reading.includes(query) || w.answer.includes(query));
  }

  function visibleEntries() {
    const query = searchBox.value.trim();
    return KANJI_DATA.filter(entry => {
      const gradeOk = currentGrade === 'all' || String(entry.grade) === currentGrade;
      return gradeOk && matchesSearch(entry, query);
    });
  }

  function sortWithinGrade(list) {
    const arr = list.slice();
    switch (sortMode.value) {
      case 'reading':
        arr.sort((a, b) => a.words[0].reading.localeCompare(b.words[0].reading, 'ja'));
        break;
      case 'codepoint':
        arr.sort((a, b) => a.kanji.codePointAt(0) - b.kanji.codePointAt(0));
        break;
      case 'textbook':
        arr.sort((a, b) => a.textbookOrder - b.textbookOrder);
        break;
      default:
        break; // 収録順(データそのままの並び)
    }
    return arr;
  }

  function renderPicker() {
    const query = searchBox.value.trim();
    const entries = KANJI_DATA.filter(entry => {
      const gradeOk = currentGrade === 'all' || String(entry.grade) === currentGrade;
      return gradeOk && matchesSearch(entry, query);
    });

    const byGrade = {};
    entries.forEach(entry => {
      if (!byGrade[entry.grade]) byGrade[entry.grade] = [];
      byGrade[entry.grade].push(entry);
    });
    Object.keys(byGrade).forEach(grade => {
      byGrade[grade] = sortWithinGrade(byGrade[grade]);
    });

    picker.innerHTML = '';
    flatEntries = [];

    Object.keys(byGrade).sort((a, b) => a - b).forEach(grade => {
      const group = document.createElement('div');
      group.className = 'grade-group';

      const groupEntries = byGrade[grade];

      const title = document.createElement('label');
      title.className = 'grade-group-title';

      const groupCb = document.createElement('input');
      groupCb.type = 'checkbox';
      syncGroupCheckbox(groupCb, groupEntries);
      groupCb.addEventListener('change', () => {
        groupEntries.forEach(entry => {
          if (groupCb.checked) selected.add(entry.kanji);
          else selected.delete(entry.kanji);
        });
        renderPicker();
        refreshSelectionUI();
      });

      title.appendChild(groupCb);
      title.appendChild(document.createTextNode(`${grade}年生`));
      group.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'kanji-grid';

      groupEntries.forEach(entry => {
        const index = flatEntries.length;
        flatEntries.push(entry);

        const item = document.createElement('label');
        item.className = 'kanji-item'
          + (selected.has(entry.kanji) ? ' checked' : '')
          + (rangeMode && rangeAnchorIndex === index ? ' range-anchor' : '');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(entry.kanji);
        cb.addEventListener('change', () => {
          if (cb.checked) selected.add(entry.kanji);
          else selected.delete(entry.kanji);
          item.classList.toggle('checked', cb.checked);
          syncGroupCheckbox(groupCb, groupEntries);
          refreshSelectionUI();
        });

        item.addEventListener('click', (e) => {
          if (rangeMode) {
            e.preventDefault();
            if (rangeAnchorIndex === null) {
              rangeAnchorIndex = index;
              item.classList.add('range-anchor');
            } else {
              const start = Math.min(rangeAnchorIndex, index);
              const end = Math.max(rangeAnchorIndex, index);
              const shouldCheck = !selected.has(entry.kanji);
              for (let i = start; i <= end; i++) {
                if (shouldCheck) selected.add(flatEntries[i].kanji);
                else selected.delete(flatEntries[i].kanji);
              }
              rangeAnchorIndex = null;
              renderPicker();
              refreshSelectionUI();
            }
            return;
          }

          if (e.shiftKey && lastClickedIndex !== null) {
            e.preventDefault();
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const shouldCheck = !selected.has(entry.kanji);
            for (let i = start; i <= end; i++) {
              if (shouldCheck) selected.add(flatEntries[i].kanji);
              else selected.delete(flatEntries[i].kanji);
            }
            renderPicker();
            refreshSelectionUI();
          } else {
            lastClickedIndex = index;
          }
        });

        const glyph = document.createElement('div');
        glyph.textContent = entry.kanji;

        const yomi = document.createElement('div');
        yomi.className = 'yomi';
        yomi.textContent = entry.words[0].reading;

        item.appendChild(cb);
        item.appendChild(glyph);
        item.appendChild(yomi);
        grid.appendChild(item);
      });

      group.appendChild(grid);
      picker.appendChild(group);
    });

    if (entries.length === 0) {
      picker.innerHTML = '<p style="color:#888;">当てはまる漢字がありません</p>';
    }
  }

  function syncGroupCheckbox(groupCb, groupEntries) {
    const checkedCount = groupEntries.filter(e => selected.has(e.kanji)).length;
    groupCb.checked = checkedCount === groupEntries.length;
    groupCb.indeterminate = checkedCount > 0 && checkedCount < groupEntries.length;
  }

  function updateCount() {
    selectedCount.textContent = `${selected.size} 文字えらんでいます`;
  }

  function renderSelectedChips() {
    const entries = KANJI_DATA.filter(entry => selected.has(entry.kanji));
    selectedChips.innerHTML = '';
    entries.forEach(entry => {
      const chip = document.createElement('span');
      chip.className = 'selected-chip';
      chip.title = 'クリックで選択解除';
      chip.innerHTML = `${entry.kanji}<span class="remove-x">×</span>`;
      chip.addEventListener('click', () => {
        selected.delete(entry.kanji);
        renderPicker();
        refreshSelectionUI();
      });
      selectedChips.appendChild(chip);
    });
  }

  function updatePoolSizeHint() {
    const wordsPerKanji = parseInt(document.getElementById('wordsPerKanji').value, 10);
    const poolSize = selected.size * wordsPerKanji;
    document.getElementById('poolSizeHint').textContent = `(最大 ${poolSize} 問ぶん)`;
  }

  function refreshSelectionUI() {
    updateCount();
    renderSelectedChips();
    updatePoolSizeHint();
    saveSelection();
  }

  gradeFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    gradeFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentGrade = btn.dataset.grade;
    lastClickedIndex = null;
    rangeAnchorIndex = null;
    renderPicker();
  });

  searchBox.addEventListener('input', () => {
    lastClickedIndex = null;
    rangeAnchorIndex = null;
    renderPicker();
  });

  sortMode.addEventListener('change', () => {
    lastClickedIndex = null;
    rangeAnchorIndex = null;
    renderPicker();
  });

  rangeModeBtn.addEventListener('click', () => {
    rangeMode = !rangeMode;
    rangeAnchorIndex = null;
    rangeModeBtn.classList.toggle('active', rangeMode);
    rangeModeBtn.textContent = `範囲選択モード: ${rangeMode ? 'オン' : 'オフ'}`;
    renderPicker();
  });

  selectAllBtn.addEventListener('click', () => {
    visibleEntries().forEach(entry => selected.add(entry.kanji));
    renderPicker();
    refreshSelectionUI();
  });

  clearAllBtn.addEventListener('click', () => {
    selected.clear();
    renderPicker();
    refreshSelectionUI();
  });

  function applyPastedText(shouldAdd) {
    const chars = Array.from(new Set(pasteBox.value.trim().split('')));
    const known = chars.filter(ch => KANJI_DATA.some(entry => entry.kanji === ch));
    known.forEach(ch => {
      if (shouldAdd) selected.add(ch);
      else selected.delete(ch);
    });
    const unknown = chars.filter(ch => !known.includes(ch) && ch.trim() !== '');
    renderPicker();
    refreshSelectionUI();
    if (unknown.length > 0) {
      alert(`収録されていない文字は無視しました: ${unknown.join(' ')}`);
    }
    pasteBox.value = '';
  }

  pasteAddBtn.addEventListener('click', () => applyPastedText(true));
  pasteRemoveBtn.addEventListener('click', () => applyPastedText(false));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestions() {
    const wordsPerKanji = parseInt(document.getElementById('wordsPerKanji').value, 10);

    const entries = KANJI_DATA.filter(entry => selected.has(entry.kanji));
    let pool = [];
    entries.forEach(entry => {
      const words = entry.words.slice(0, wordsPerKanji);
      words.forEach(w => {
        pool.push({
          kanji: entry.kanji,
          grade: entry.grade,
          reading: w.reading,
          answer: w.answer,
        });
      });
    });

    pool = shuffle(pool);

    const requested = parseInt(document.getElementById('questionCount').value, 10);
    const count = (!requested || requested <= 0) ? pool.length : Math.min(requested, pool.length);
    return pool.slice(0, count);
  }

  function renderWorksheet(questions) {
    const showGrade = document.getElementById('showFuriGrade').checked;

    if (questions.length === 0) {
      worksheet.classList.remove('has-content');
      worksheet.innerHTML = '';
      alert('漢字を1つ以上えらんでから「テストを作成する」を押してください。');
      return;
    }

    const listHtml = questions.map((q, i) => `
      <li class="question-item">
        <span class="question-number">${i + 1}.</span>
        <span class="question-reading">${q.reading}${showGrade ? `<span class="question-grade-tag">${q.grade}年</span>` : ''}</span>
      </li>
    `).join('');

    const answerHtml = questions.map((q, i) => `
      <div><span class="answer-number">${i + 1}.</span><span class="reading">${q.reading}</span><strong>${q.answer}</strong><span class="answer-kanji" data-kanji="${q.kanji}" title="クリックで出題対象から外す/戻す">${q.kanji}</span></div>
    `).join('');

    worksheet.innerHTML = `
      <div class="sheet-header">
        <h2>かんじ 書き取り テスト</h2>
        <div class="sheet-meta">
          <span class="blank"></span>年<span class="blank"></span>組
          なまえ<span class="blank" style="min-width:160px;"></span>
        </div>
      </div>
      <ul class="question-list">${listHtml}</ul>
      <div class="answer-page">
        <h3>解答一覧(先生・保護者用)</h3>
        <div class="answer-grid">${answerHtml}</div>
      </div>
    `;
    worksheet.classList.add('has-content');
    worksheet.scrollIntoView({ behavior: 'smooth' });
  }

  worksheet.addEventListener('click', (e) => {
    const tag = e.target.closest('.answer-kanji');
    if (!tag) return;
    const kanji = tag.dataset.kanji;
    if (selected.has(kanji)) selected.delete(kanji);
    else selected.add(kanji);
    renderPicker();
    refreshSelectionUI();
    worksheet.querySelectorAll('.answer-kanji').forEach(el => {
      if (el.dataset.kanji === kanji) el.classList.toggle('deselected', !selected.has(kanji));
    });
  });

  document.getElementById('wordsPerKanji').addEventListener('change', updatePoolSizeHint);

  generateBtn.addEventListener('click', () => {
    const questions = buildQuestions();
    renderWorksheet(questions);
  });

  printBtn.addEventListener('click', () => {
    if (!worksheet.classList.contains('has-content')) {
      alert('先に「テストを作成する」を押してください。');
      return;
    }
    window.print();
  });

  loadSelection();
  renderPicker();
  refreshSelectionUI();
})();
