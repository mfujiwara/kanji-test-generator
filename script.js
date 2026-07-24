(function () {
  const picker = document.getElementById('kanjiPicker');
  const gradeFilter = document.getElementById('gradeFilter');
  const searchBox = document.getElementById('searchBox');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const selectedCount = document.getElementById('selectedCount');
  const generateBtn = document.getElementById('generateBtn');
  const printBtn = document.getElementById('printBtn');
  const worksheet = document.getElementById('worksheet');

  const selected = new Set();
  let currentGrade = 'all';

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

    picker.innerHTML = '';
    Object.keys(byGrade).sort((a, b) => a - b).forEach(grade => {
      const group = document.createElement('div');
      group.className = 'grade-group';

      const title = document.createElement('div');
      title.className = 'grade-group-title';
      title.textContent = `${grade}年生`;
      group.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'kanji-grid';

      byGrade[grade].forEach(entry => {
        const item = document.createElement('label');
        item.className = 'kanji-item' + (selected.has(entry.kanji) ? ' checked' : '');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(entry.kanji);
        cb.addEventListener('change', () => {
          if (cb.checked) selected.add(entry.kanji);
          else selected.delete(entry.kanji);
          item.classList.toggle('checked', cb.checked);
          updateCount();
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

  function updateCount() {
    selectedCount.textContent = `${selected.size} 文字えらんでいます`;
  }

  gradeFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    gradeFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentGrade = btn.dataset.grade;
    renderPicker();
  });

  searchBox.addEventListener('input', renderPicker);

  selectAllBtn.addEventListener('click', () => {
    visibleEntries().forEach(entry => selected.add(entry.kanji));
    renderPicker();
    updateCount();
  });

  clearAllBtn.addEventListener('click', () => {
    selected.clear();
    renderPicker();
    updateCount();
  });

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
    const orderMode = document.getElementById('orderMode').value;

    const entries = KANJI_DATA.filter(entry => selected.has(entry.kanji));
    let questions = [];
    entries.forEach(entry => {
      const words = entry.words.slice(0, wordsPerKanji);
      words.forEach(w => {
        questions.push({
          kanji: entry.kanji,
          grade: entry.grade,
          reading: w.reading,
          answer: w.answer,
        });
      });
    });

    if (orderMode === 'shuffle') {
      questions = shuffle(questions);
    }
    return questions;
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
        <span class="answer-box"></span>
      </li>
    `).join('');

    const answerHtml = questions.map(q => `
      <div><span class="reading">${q.reading}</span><strong>${q.answer}</strong></div>
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

  renderPicker();
  updateCount();
})();
