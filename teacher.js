let currentTab = 'create';

window.onload = function () {
    loadTestList();
    loadGithubSettings();
    
    // Kontrola, zda URL obsahuje výsledek od studenta
    const urlParams = new URLSearchParams(window.location.search);
    const resultEncoded = urlParams.get('result');
    
    if (resultEncoded) {
        try {
            const resultJson = decodeURIComponent(atob(resultEncoded));
            const result = JSON.parse(resultJson);
            
            // Uložení výsledku
            const results = JSON.parse(localStorage.getItem('results') || '{}');
            if (!results[result.testId]) {
                results[result.testId] = [];
            }
            results[result.testId].push(result);
            localStorage.setItem('results', JSON.stringify(results));
            
            // Vyčištění URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Zobrazení notifikace
            alert(`✅ Výsledek přijat!\n\nStudent: ${result.firstName} ${result.lastName}\nTřída: ${result.className}\nZnámka: ${result.grade}\n\nVýsledky najdete v záložce "Výsledky testů".`);
            
            // Přepnutí na záložku výsledků
            showTab('results');
        } catch (e) {
            console.error('Chyba při načítání výsledku:', e);
        }
    }
};

function saveGithubSettings() {
    const repo = document.getElementById('githubRepo').value.trim();
    const token = document.getElementById('githubToken').value.trim();
    
    if (!repo || !token) {
        alert('Vyplňte repository a token!');
        return;
    }
    
    localStorage.setItem('githubRepo', repo);
    localStorage.setItem('githubToken', token);
    alert('GitHub nastavení uloženo!');
}

function loadGithubSettings() {
    const repo = localStorage.getItem('githubRepo') || '';
    const token = localStorage.getItem('githubToken') || '';
    
    document.getElementById('githubRepo').value = repo;
    document.getElementById('githubToken').value = token;
}

async function uploadToGithub(testId, testData) {
    const repo = localStorage.getItem('githubRepo');
    const token = localStorage.getItem('githubToken');
    
    if (!repo || !token) {
        alert('Nejprve nastavte GitHub repository a token!');
        return false;
    }
    
    const fileName = `tests/${testId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(testData, null, 2))));
    
    try {
        // Kontrola, zda soubor již existuje
        let sha = null;
        try {
            const checkResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (checkResponse.ok) {
                const data = await checkResponse.json();
                sha = data.sha;
            }
        } catch (e) {
            // Soubor neexistuje, to je OK
        }
        
        // Nahrání souboru
        const body = {
            message: `Add test: ${testData.name}`,
            content: content,
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Chyba při nahrávání na GitHub');
        }
        
        return true;
    } catch (error) {
        console.error('GitHub upload error:', error);
        alert('Chyba při nahrávání na GitHub: ' + error.message);
        return false;
    }
}

function loadWordFile() {
    const fileInput = document.getElementById('wordFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
            .then(function(result) {
                const text = result.value;
                parseWordContent(text);
            })
            .catch(function(err) {
                alert('Chyba při čtení Word dokumentu: ' + err.message);
            });
    };
    
    reader.readAsArrayBuffer(file);
}

function parseWordContent(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
        alert('Word dokument je prázdný!');
        return;
    }
    
    // První řádek je název testu
    const testName = lines[0].replace(/^Název testu:?\s*/i, '');
    document.getElementById('testName').value = testName;
    
    const questions = [];
    let currentQuestion = null;
    let questionNumber = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Detekce otázky (začíná číslem a tečkou)
        const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (questionMatch) {
            if (currentQuestion && currentQuestion.answers.length === 4) {
                questions.push(currentQuestion);
            }
            
            questionNumber = parseInt(questionMatch[1]);
            currentQuestion = {
                question: questionMatch[2],
                image: "",
                answers: [],
                correct: -1
            };
            continue;
        }
        
        // Detekce odpovědi (A), B), C), D))
        const answerMatch = line.match(/^([A-D])\)\s*(.+)/i);
        if (answerMatch && currentQuestion) {
            currentQuestion.answers.push(answerMatch[2]);
            continue;
        }
        
        // Detekce správné odpovědi
        const correctMatch = line.match(/^Správně:\s*([A-D])/i);
        if (correctMatch && currentQuestion) {
            const correctLetter = correctMatch[1].toUpperCase();
            currentQuestion.correct = correctLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            continue;
        }
        
        // Pokud není žádný match a máme otázku, přidej k textu otázky
        if (currentQuestion && !answerMatch && !correctMatch && currentQuestion.answers.length === 0) {
            currentQuestion.question += ' ' + line;
        }
    }
    
    // Přidej poslední otázku
    if (currentQuestion && currentQuestion.answers.length === 4) {
        questions.push(currentQuestion);
    }
    
    // Validace
    const invalidQuestions = questions.filter(q => 
        q.answers.length !== 4 || q.correct === -1
    );
    
    if (invalidQuestions.length > 0) {
        alert(`Varování: ${invalidQuestions.length} otázek má chybný formát. Zkontrolujte JSON.`);
    }
    
    // Zobraz JSON
    document.getElementById('questionsJson').value = JSON.stringify(questions, null, 2);
    
    alert(`Načteno ${questions.length} otázek z Word dokumentu!`);
}

function showTab(tabName) {
    currentTab = tabName;
    
    // Aktualizace tlačítek
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Najít správné tlačítko podle tabName
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if ((tabName === 'create' && btn.textContent.includes('Vytvořit')) ||
            (tabName === 'results' && btn.textContent.includes('Výsledky'))) {
            btn.classList.add('active');
        }
    });
    
    // Aktualizace obsahu
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    if (tabName === 'results') {
        loadTestList();
    }
}

async function createTest() {
    const testName = document.getElementById('testName').value.trim();
    const questionsJson = document.getElementById('questionsJson').value.trim();
    
    if (!testName) {
        alert('Vyplňte název testu!');
        return;
    }
    
    let questions;
    try {
        questions = JSON.parse(questionsJson);
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Otázky musí být pole s alespoň jednou otázkou');
        }
        
        // Validace struktury
        questions.forEach((q, i) => {
            if (!q.question || !Array.isArray(q.answers) || q.answers.length !== 4 || typeof q.correct !== 'number') {
                throw new Error(`Chyba v otázce ${i + 1}: Musí obsahovat question, answers (pole 4 položek) a correct (číslo 0-3)`);
            }
        });
    } catch (e) {
        alert('Chyba v JSON formátu otázek: ' + e.message);
        return;
    }
    
    // Bodování
    const grading = {
        grade1: parseInt(document.getElementById('grade1').value),
        grade2: parseInt(document.getElementById('grade2').value),
        grade3: parseInt(document.getElementById('grade3').value),
        grade4: parseInt(document.getElementById('grade4').value),
        grade5: parseInt(document.getElementById('grade5').value)
    };
    
    // Vytvoření testu
    const testId = 'test_' + Date.now();
    const githubRepo = localStorage.getItem('githubRepo');
    const githubToken = localStorage.getItem('githubToken');
    
    const test = {
        id: testId,
        name: testName,
        questions: questions,
        grading: grading,
        created: new Date().toISOString(),
        githubRepo: githubRepo,
        githubToken: githubToken
    };
    
    // Uložení do localStorage (pro učitele)
    const tests = JSON.parse(localStorage.getItem('tests') || '{}');
    tests[testId] = test;
    localStorage.setItem('tests', JSON.stringify(tests));
    
    // Automatické nahrání na GitHub
    const uploaded = await uploadToGithub(testId, test);
    
    if (uploaded) {
        // Zobrazení linku
        const githubRepo = localStorage.getItem('githubRepo');
        const link = `https://${githubRepo.split('/')[0]}.github.io/${githubRepo.split('/')[1]}/student.html?test=${testId}`;
        document.getElementById('generatedLink').value = link;
        document.getElementById('testLink').classList.remove('hidden');
        
        alert('✅ Test byl úspěšně vytvořen a nahrán na GitHub!\n\nPočkejte 1-2 minuty než se GitHub Pages aktualizuje, pak pošlete link studentům.');
    } else {
        // Fallback - stažení JSON
        const testJson = JSON.stringify(test, null, 2);
        const blob = new Blob([testJson], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = window.location.origin + window.location.pathname.replace('teacher.html', 'student.html') + '?test=' + testId;
        document.getElementById('generatedLink').value = link;
        document.getElementById('testLink').classList.remove('hidden');
        
        // Přidání tlačítka pro stažení JSON
        const downloadBtn = document.createElement('a');
        downloadBtn.href = downloadUrl;
        downloadBtn.download = `${testId}.json`;
        downloadBtn.className = 'btn btn-secondary';
        downloadBtn.textContent = 'Stáhnout test (JSON)';
        downloadBtn.style.marginTop = '10px';
        downloadBtn.style.display = 'inline-block';
        
        const linkDiv = document.getElementById('testLink');
        const existingBtn = linkDiv.querySelector('a.btn-secondary');
        if (existingBtn) existingBtn.remove();
        linkDiv.appendChild(downloadBtn);
        
        alert('⚠️ Nepodařilo se nahrát na GitHub automaticky.\n\n1. Stáhněte JSON soubor\n2. Nahrajte ho ručně do složky "tests" na GitHubu\n3. Pošlete link studentům');
    }
}

function copyLink() {
    const linkInput = document.getElementById('generatedLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link byl zkopírován do schránky!');
}

function loadTestList() {
    const tests = JSON.parse(localStorage.getItem('tests') || '{}');
    const select = document.getElementById('testSelect');
    
    select.innerHTML = '<option value="">-- Vyberte test --</option>';
    
    Object.values(tests).forEach(test => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.name;
        select.appendChild(option);
    });
}

async function loadResults() {
    const testId = document.getElementById('testSelect').value;
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!testId) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    resultsContainer.innerHTML = '<p>Načítání výsledků z GitHubu...</p>';
    
    // Načtení výsledků z GitHubu
    const githubResults = await loadResultsFromGithub(testId);
    
    // Sloučení s lokálními výsledky
    const localResults = JSON.parse(localStorage.getItem('results') || '{}');
    const testResults = [...(localResults[testId] || []), ...githubResults];
    
    if (testResults.length === 0) {
        resultsContainer.innerHTML = '<p>Zatím žádné výsledky. <button onclick="loadResults()" class="btn btn-secondary">Obnovit</button></p>';
        return;
    }
    
    let html = `
        <button onclick="loadResults()" class="btn btn-secondary" style="margin-right: 10px;">🔄 Obnovit</button>
        <button onclick="exportToCSV('${testId}')" class="btn btn-primary export-btn">Exportovat do CSV</button>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Jméno</th>
                    <th>Příjmení</th>
                    <th>Třída</th>
                    <th>Body</th>
                    <th>Úspěšnost</th>
                    <th>Známka</th>
                    <th>Datum</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    testResults.forEach(result => {
        const date = new Date(result.timestamp).toLocaleString('cs-CZ');
        html += `
            <tr>
                <td>${result.firstName}</td>
                <td>${result.lastName}</td>
                <td>${result.className}</td>
                <td>${result.correctCount}/${result.totalQuestions}</td>
                <td>${result.percentage}%</td>
                <td>${result.grade}</td>
                <td>${date}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    resultsContainer.innerHTML = html;
}

async function loadResultsFromGithub(testId) {
    const repo = localStorage.getItem('githubRepo');
    const token = localStorage.getItem('githubToken');
    
    if (!repo || !token) {
        return [];
    }
    
    try {
        // Načtení seznamu souborů ve složce results
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/results`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            return [];
        }
        
        const files = await response.json();
        const results = [];
        
        // Načtení každého výsledku
        for (const file of files) {
            if (file.name.endsWith('.json')) {
                try {
                    const fileResponse = await fetch(file.download_url);
                    const result = await fileResponse.json();
                    
                    // Filtrovat podle testId
                    if (result.testId === testId) {
                        results.push(result);
                    }
                } catch (e) {
                    console.error('Error loading result:', e);
                }
            }
        }
        
        return results;
    } catch (error) {
        console.error('Error loading results from GitHub:', error);
        return [];
    }
}

function exportToCSV(testId) {
    const results = JSON.parse(localStorage.getItem('results') || '{}');
    const testResults = results[testId] || [];
    
    if (testResults.length === 0) {
        alert('Žádné výsledky k exportu!');
        return;
    }
    
    // CSV hlavička
    let csv = 'Jméno,Příjmení,Třída,Body,Celkem,Úspěšnost (%),Známka,Datum\n';
    
    // Data
    testResults.forEach(result => {
        const date = new Date(result.timestamp).toLocaleString('cs-CZ');
        csv += `${result.firstName},${result.lastName},${result.className},${result.correctCount},${result.totalQuestions},${result.percentage},${result.grade},"${date}"\n`;
    });
    
    // Stažení souboru
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const tests = JSON.parse(localStorage.getItem('tests') || '{}');
    const testName = tests[testId].name;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vysledky_${testName}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
