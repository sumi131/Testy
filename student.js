let testData = null;
let studentAnswers = [];
let currentQuestionIndex = 0;
let studentInfo = {};

// Načtení testu z URL parametru
window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('test');

    if (testId) {
        loadTestFromServer(testId);
    } else {
        alert('Chybí ID testu v URL!');
    }
};

function loadTestFromServer(testId) {
    // Pokus načíst z GitHubu
    const githubUrl = `tests/${testId}.json`;

    fetch(githubUrl)
        .then((response) => {
            if (!response.ok) throw new Error('Test nenalezen na serveru');
            return response.json();
        })
        .then((data) => {
            testData = data;
            document.getElementById('testTitle').textContent = testData.name;
            document.getElementById('totalQuestions').textContent = testData.questions.length;
            studentAnswers = new Array(testData.questions.length).fill(null);
        })
        .catch((error) => {
            alert('Test nebyl nalezen! Ujistěte se, že učitel nahrál test na server.');
            console.error(error);
        });
}

function startTest() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const className = document.getElementById('className').value.trim();
    
    if (!firstName || !lastName || !className) {
        alert('Vyplňte prosím všechny údaje!');
        return;
    }
    
    studentInfo = { firstName, lastName, className };
    
    document.getElementById('studentInfo').classList.add('hidden');
    document.getElementById('testContainer').classList.remove('hidden');
    
    showQuestion(0);
}

function showQuestion(index) {
    currentQuestionIndex = index;
    const question = testData.questions[index];
    
    document.getElementById('questionText').textContent = `${index + 1}. ${question.question}`;
    document.getElementById('currentQuestion').textContent = index + 1;
    
    // Obrázek
    const imgElement = document.getElementById('questionImage');
    if (question.image) {
        imgElement.src = question.image;
        imgElement.classList.remove('hidden');
    } else {
        imgElement.classList.add('hidden');
    }
    
    // Odpovědi
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = '';
    
    question.answers.forEach((answer, i) => {
        const div = document.createElement('div');
        div.className = 'answer-option';
        if (studentAnswers[index] === i) {
            div.classList.add('selected');
        }
        div.textContent = `${String.fromCharCode(65 + i)}) ${answer}`;
        div.onclick = () => selectAnswer(i);
        answersContainer.appendChild(div);
    });
    
    // Navigační tlačítka
    document.getElementById('prevBtn').disabled = index === 0;
    
    if (index === testData.questions.length - 1) {
        document.getElementById('nextBtn').classList.add('hidden');
        document.getElementById('submitBtn').classList.remove('hidden');
    } else {
        document.getElementById('nextBtn').classList.remove('hidden');
        document.getElementById('submitBtn').classList.add('hidden');
    }
    
    // Progress bar
    const progress = ((index + 1) / testData.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

function selectAnswer(answerIndex) {
    studentAnswers[currentQuestionIndex] = answerIndex;
    
    // Aktualizace vizuálu
    const options = document.querySelectorAll('.answer-option');
    options.forEach((opt, i) => {
        if (i === answerIndex) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < testData.questions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    }
}

function submitTest() {
    // Kontrola, zda jsou všechny otázky zodpovězeny
    const unanswered = studentAnswers.findIndex(a => a === null);
    if (unanswered !== -1) {
        if (!confirm(`Nezodpověděli jste otázku ${unanswered + 1}. Chcete přesto odeslat test?`)) {
            return;
        }
    }
    
    // Výpočet výsledků
    let correctCount = 0;
    testData.questions.forEach((q, i) => {
        if (studentAnswers[i] === q.correct) {
            correctCount++;
        }
    });
    
    const percentage = Math.round((correctCount / testData.questions.length) * 100);
    const grade = calculateGrade(percentage);
    
    // Uložení výsledků
    saveResults(correctCount, percentage, grade);
    
    // Zobrazení výsledků
    showResults(correctCount, percentage, grade);
}

function calculateGrade(percentage) {
    const grading = testData.grading;
    if (percentage >= grading.grade1) return 1;
    if (percentage >= grading.grade2) return 2;
    if (percentage >= grading.grade3) return 3;
    if (percentage >= grading.grade4) return 4;
    return 5;
}

async function saveResults(correctCount, percentage, grade) {
    const resultId = 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const result = {
        resultId: resultId,
        testName: testData.name,
        testId: testData.id,
        ...studentInfo,
        correctCount,
        totalQuestions: testData.questions.length,
        percentage,
        grade,
        answers: studentAnswers,
        timestamp: new Date().toISOString()
    };
    
    // Zobrazení zprávy o odesílání
    const sendDiv = document.createElement('div');
    sendDiv.id = 'sendStatus';
    sendDiv.style.marginTop = '30px';
    sendDiv.style.padding = '20px';
    sendDiv.style.background = '#fff3cd';
    sendDiv.style.borderRadius = '8px';
    sendDiv.innerHTML = `
        <h3>📤 Odesílání výsledků...</h3>
        <p>Prosím čekejte, výsledky se odesílají učiteli...</p>
    `;
    document.getElementById('resultsContainer').appendChild(sendDiv);
    
    // Pokus o automatické odeslání na GitHub
    try {
        const success = await uploadResultToGithub(resultId, result);
        
        if (success) {
            sendDiv.style.background = '#d4edda';
            sendDiv.innerHTML = `
                <h3>✅ Výsledky úspěšně odeslány!</h3>
                <p>Učitel uvidí vaše výsledky v prostředí učitele.</p>
                <p><strong>Můžete zavřít tuto stránku.</strong></p>
            `;
        } else {
            throw new Error('Nepodařilo se odeslat');
        }
    } catch (error) {
        // Fallback - zobrazit link
        const resultEncoded = btoa(encodeURIComponent(JSON.stringify(result)));
        const teacherLink = window.location.origin + window.location.pathname.replace('student.html', 'teacher.html') + '?result=' + resultEncoded;
        
        sendDiv.style.background = '#f8d7da';
        sendDiv.innerHTML = `
            <h3>⚠️ Automatické odeslání se nezdařilo</h3>
            <p>Zkopírujte tento link a pošlete ho učiteli (email, Teams, atd.):</p>
            <input type="text" value="${teacherLink}" readonly style="width: 100%; padding: 10px; margin: 10px 0; font-size: 12px;">
            <button onclick="copyResultLink('${teacherLink}')" class="btn btn-primary">Kopírovat link</button>
        `;
    }
}

async function uploadResultToGithub(resultId, result) {
    // Získání GitHub info z testu
    if (!testData.githubRepo || !testData.githubToken) {
        return false;
    }
    
    const repo = testData.githubRepo;
    const token = testData.githubToken;
    const fileName = `results/${resultId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(result, null, 2))));
    
    try {
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Add result from ${result.firstName} ${result.lastName}`,
                content: content,
                branch: 'main'
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('GitHub upload error:', error);
        return false;
    }
}

function showResults(correctCount, percentage, grade) {
    document.getElementById('testContainer').classList.add('hidden');
    document.getElementById('resultsContainer').classList.remove('hidden');
    
    document.getElementById('score').textContent = correctCount;
    document.getElementById('maxScore').textContent = testData.questions.length;
    document.getElementById('percentage').textContent = percentage;
    document.getElementById('grade').textContent = grade;
    
    // Zobrazení správných odpovědí
    const correctAnswersDiv = document.getElementById('correctAnswers');
    correctAnswersDiv.innerHTML = '';
    
    testData.questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'correct-answer-item';
        
        const isCorrect = studentAnswers[i] === q.correct;
        if (!isCorrect) {
            div.classList.add('wrong');
        }
        
        const studentAnswerText = studentAnswers[i] !== null 
            ? q.answers[studentAnswers[i]] 
            : 'Nezodpovězeno';
        
        div.innerHTML = `
            <strong>${i + 1}. ${q.question}</strong><br>
            Vaše odpověď: ${studentAnswerText} ${isCorrect ? '✓' : '✗'}<br>
            Správná odpověď: ${q.answers[q.correct]}
        `;
        
        correctAnswersDiv.appendChild(div);
    });
}

function copyResultLink(link) {
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('Link zkopírován! Pošlete ho učiteli.');
}
