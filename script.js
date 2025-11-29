/* script.js - Modelo Híbrido (Poisson + forças + heurísticas)
   Versão corrigida e organizada para o HTML fornecido.
*/

let chartInstance = null;
let margemEscanteios = 1.5;
const DEFAULT_MAX_GOALS = 12;

// --------------------------
// HELPERS MATH
// --------------------------
function mean(arr) {
    const valid = Array.isArray(arr) ? arr.filter(v => typeof v === 'number' && !Number.isNaN(v)) : [];
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sum(arr) {
    return Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0;
}

function poissonP(lambda, k) {
    if (lambda <= 0) return k === 0 ? 1 : 0;

    let term = Math.exp(-lambda);
    for (let i = 1; i <= k; i++) {
        term *= lambda / i;
    }
    return term;
}

// --------------------------
// LEITURA DE INPUTS
// --------------------------
function getValues(prefix, jogos = 5) {
    const vals = [];
    for (let i = 1; i <= jogos; i++) {
        const el = document.getElementById(`${prefix}${i}`);
        const v = el ? Number(el.value) : NaN;
        vals.push(isNaN(v) ? 0 : v);
    }
    return vals;
}

function coletarTodosDados() {
    return {
        nomeA: (document.getElementById('nomeTimeA')?.value || 'Time A').trim(),
        nomeB: (document.getElementById('nomeTimeB')?.value || 'Time B').trim(),

        golsA: getValues('golsA'),
        golsB: getValues('golsB'),

        sofridosA: getValues('sofridosA'),
        sofridosB: getValues('sofridosB'),

        escA: getValues('escanteiosA'),
        escB: getValues('escanteiosB'),

        escSofA: getValues('escSofridosA'),
        escSofB: getValues('escSofridosB'),

        cartA: getValues('cartoesA'),
        cartB: getValues('cartoesB'),

        cdA: getValues('cdGolsA'),
        cdB: getValues('cdGolsB'),

        margemEsc: margemEscanteios
    };
}

// --------------------------
// MODELO HÍBRIDO - LAMBDAS
// --------------------------
function calcularLambdas(mediaGolsA, mediaSofridosA, mediaGolsB, mediaSofridosB) {
    let lambdaA = mediaGolsA + 0.5 * (mediaGolsA - mediaSofridosB);
    let lambdaB = mediaGolsB + 0.5 * (mediaGolsB - mediaSofridosA);

    lambdaA = Math.max(lambdaA, 0.10);
    lambdaB = Math.max(lambdaB, 0.10);

    return { lambdaA, lambdaB };
}

// --------------------------
// DISTRIBUIÇÃO TOTAL DE GOLS
// --------------------------
function probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals = DEFAULT_MAX_GOALS) {
    const probs = new Array(maxGoals + 1).fill(0);
    for (let t = 0; t <= maxGoals; t++) {
        let acc = 0;
        for (let i = 0; i <= t; i++) {
            acc += poissonP(lambdaA, i) * poissonP(lambdaB, t - i);
        }
        probs[t] = acc;
    }
    return probs;
}

function probTotalAtLeast(lambdaA, lambdaB, k, maxGoals = DEFAULT_MAX_GOALS) {
    const dist = probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals);
    let acc = 0;
    for (let t = k; t <= maxGoals; t++) acc += dist[t];
    return Math.min(100, Math.round(acc * 100));
}

function probTotalAtMost(lambdaA, lambdaB, k, maxGoals = DEFAULT_MAX_GOALS) {
    const dist = probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals);
    let acc = 0;
    for (let t = 0; t <= k; t++) acc += dist[t];
    return Math.min(100, Math.round(acc * 100));
}

// --------------------------
// VITÓRIA / EMPATE / DERROTA
// --------------------------
function winDrawLoseProb(lambdaA, lambdaB, maxGoals = DEFAULT_MAX_GOALS) {
    let pAwin = 0, pDraw = 0, pBwin = 0;
    for (let i = 0; i <= maxGoals; i++) {
        const pAi = poissonP(lambdaA, i);
        for (let j = 0; j <= maxGoals; j++) {
            const pBj = poissonP(lambdaB, j);
            const p = pAi * pBj;
            if (i > j) pAwin += p;
            else if (i === j) pDraw += p;
            else pBwin += p;
        }
    }
    return {
        pAwin: Math.round(pAwin * 100),
        pDraw: Math.round(pDraw * 100),
        pBwin: Math.round(pBwin * 100)
    };
}

// --------------------------
// BTTS
// --------------------------
function probBTTS(lambdaA, lambdaB) {
    const pA0 = poissonP(lambdaA, 0);
    const pB0 = poissonP(lambdaB, 0);
    const p = 1 - pA0 - pB0 + pA0 * pB0;
    return Math.min(100, Math.round(p * 100));
}

// --------------------------
// ESCANTEIOS
// --------------------------
function probEscanteiosAtLeast(meanEscA, meanEscB, threshold = 5) {
    const lambda = Math.max(0.1, meanEscA + meanEscB);
    let soma = 0;
    for (let k = 0; k < threshold; k++) soma += poissonP(lambda, k);
    return Math.min(100, Math.round((1 - soma) * 100));
}

function estimativaEscanteiosInterval(meanEscA, meanEscB, margem = 1.5) {
    const lambda = Math.max(0, meanEscA + meanEscB);
    const desvio = Math.sqrt(lambda);
    const minimo = Math.max(0, Math.floor(lambda - desvio * margem));
    const maximo = Math.ceil(lambda + desvio * margem);
    return { min: minimo, max: maximo, lambda };
}

// --------------------------
// CARTÕES
// --------------------------
function probMaisDeDoisCartoes(meanCartA, meanCartB) {
    const m = meanCartA + meanCartB;
    return Math.min(100, Math.round((m / 6) * 100));
}

// --------------------------
// SUGESTÕES
// --------------------------
function montarSugestoes(probabilidades) {
    const arr = Object.keys(probabilidades).map(k => ({
        name: k,
        prob: probabilidades[k]
    }));
    arr.sort((a, b) => b.prob - a.prob);
    return arr.map(i => `${i.name}: ${i.prob}%`);
}

// --------------------------
// FUNÇÃO PRINCIPAL
// --------------------------
function calcularProbabilidades() {
    try {
        const anyInput = Array.from(document.querySelectorAll('input')).some(i => i.value.trim() !== '');
        if (!anyInput) {
            alert('Preencha pelo menos um campo.');
            return;
        }

        const dados = coletarTodosDados();

        const mediaGolsA = mean(dados.golsA);
        const mediaGolsB = mean(dados.golsB);
        const mediaSofA = mean(dados.sofridosA);
        const mediaSofB = mean(dados.sofridosB);

        const mediaEscA = mean(dados.escA);
        const mediaEscB = mean(dados.escB);

        const mediaCartA = mean(dados.cartA);
        const mediaCartB = mean(dados.cartB);

        const { lambdaA, lambdaB } = calcularLambdas(mediaGolsA, mediaSofA, mediaGolsB, mediaSofB);

        const over15 = probTotalAtLeast(lambdaA, lambdaB, 2);
        const over25 = probTotalAtLeast(lambdaA, lambdaB, 3);
        const under35 = probTotalAtMost(lambdaA, lambdaB, 3);

        const btts = probBTTS(lambdaA, lambdaB);

        const { pAwin, pDraw, pBwin } = winDrawLoseProb(lambdaA, lambdaB);

        const prob5Esc = probEscanteiosAtLeast(mediaEscA, mediaEscB, 5);
        const escInterval = estimativaEscanteiosInterval(mediaEscA, mediaEscB, dados.margemEsc);

        const probCart = probMaisDeDoisCartoes(mediaCartA, mediaCartB);

        const sugestoesOrdenadas = montarSugestoes({
            '+1.5 gols': over15,
            'Ambos marcam': btts,
            '+2.5 gols': over25,
            'Vitória provável (A)': pAwin,
            'Vitória provável (B)': pBwin,
            '+5 escanteios': prob5Esc
        });

        const resultadoDiv = document.getElementById('resultado');
        resultadoDiv.innerHTML = `
            <h3>Resumo</h3>
            <p><strong>${dados.nomeA}</strong> — média gols: ${mediaGolsA.toFixed(2)}, sofridos: ${mediaSofA.toFixed(2)}</p>
            <p><strong>${dados.nomeB}</strong> — média gols: ${mediaGolsB.toFixed(2)}, sofridos: ${mediaSofB.toFixed(2)}</p>

            <p><strong>Lambda (A):</strong> ${lambdaA.toFixed(2)} — <strong>Lambda (B):</strong> ${lambdaB.toFixed(2)}</p>

            <p>+1.5 gols: <strong>${over15}%</strong></p>
            <p>+2.5 gols: <strong>${over25}%</strong></p>
            <p>Under 3.5: <strong>${under35}%</strong></p>

            <p>Ambos marcam: <strong>${btts}%</strong></p>

            <p>Vitória ${dados.nomeA}: ${pAwin}% | Empate: ${pDraw}% | Vitória ${dados.nomeB}: ${pBwin}%</p>

            <p>Escanteios estimados (λ): ${escInterval.lambda.toFixed(2)} — intervalo: ${escInterval.min}–${escInterval.max}</p>
            <p>Prob. ≥5 escanteios: <strong>${prob5Esc}%</strong></p>

            <p>Média cartões: ${(mediaCartA + mediaCartB).toFixed(2)} — Probabilidade >2: <strong>${probCart}%</strong></p>

            <h4>Sugestões ordenadas</h4>
            <ul>
                ${sugestoesOrdenadas.map(s => `<li>${s}</li>`).join('')}
            </ul>
        `;

        atualizarGraficoChart({
            labels: ['+1.5', '+2.5', 'Ambos marcam', '≥5 escanteios'],
            data: [over15, over25, btts, prob5Esc]
        });

    } catch (err) {
        console.error('Erro em calcularProbabilidades():', err);
        alert('Erro interno. Veja o console.');
    }
}

// --------------------------
// GRÁFICO (Chart.js)
// --------------------------
function atualizarGraficoChart({ labels, data }) {
    const canvas = document.getElementById('grafico');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Probabilidade (%)',
                data,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
            },
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

// --------------------------
// UTILIDADES: limpar e preencher
// --------------------------
function limparFormulario() {
    document.querySelectorAll('input[type="number"], input[type="text"]').forEach(i => i.value = '');
    document.getElementById('resultado').innerHTML = '';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function preencherAutomaticamente() {
    document.getElementById('nomeTimeA').value = 'Palmeiras';
    document.getElementById('nomeTimeB').value = 'Corinthians';

    const sampleA = [2, 1, 3, 0, 1];
    const sampleB = [1, 1, 0, 2, 2];

    for (let i = 1; i <= 5; i++) {
        const mappingsA = {
            golsA: sampleA[i - 1],
            sofridosA: (i % 2),
            escanteiosA: Math.floor(Math.random() * 6),
            escSofridosA: Math.floor(Math.random() * 6),
            cartoesA: Math.floor(Math.random() * 3)
        };
        const mappingsB = {
            golsB: sampleB[i - 1],
            sofridosB: (i % 2),
            escanteiosB: Math.floor(Math.random() * 6),
            escSofridosB: Math.floor(Math.random() * 6),
            cartoesB: Math.floor(Math.random() * 3)
        };

        for (const key in mappingsA) {
            const el = document.getElementById(`${key}${i}`);
            if (el) el.value = mappingsA[key];
        }
        for (const key in mappingsB) {
            const el = document.getElementById(`${key}${i}`);
            if (el) el.value = mappingsB[key];
        }

        // confronto direto
        const cdA = Math.floor(Math.random() * 3);
        const cdB = Math.floor(Math.random() * 3);
        if (document.getElementById(`cdGolsA${i}`)) document.getElementById(`cdGolsA${i}`).value = cdA;
        if (document.getElementById(`cdGolsB${i}`)) document.getElementById(`cdGolsB${i}`).value = cdB;
    }

    document.getElementById('valorMargem').textContent = margemEscanteios.toFixed(1);
}

// --------------------------
// EVENT BINDING
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            calcularProbabilidades();
        });
    }

    const btnPreencher = document.getElementById('preencher');
    if (btnPreencher) btnPreencher.addEventListener('click', preencherAutomaticamente);

    const btnLimpar = document.getElementById('limpar');
    if (btnLimpar) btnLimpar.addEventListener('click', limparFormulario);

    const margemInput = document.getElementById('margemEsc');
    const valorSpan = document.getElementById('valorMargem');
    if (margemInput && valorSpan) {
        margemEscanteios = parseFloat(margemInput.value) || margemEscanteios;
        valorSpan.textContent = margemEscanteios.toFixed(1);
        margemInput.addEventListener('input', (e) => {
            margemEscanteios = parseFloat(e.target.value) || margemEscanteios;
            valorSpan.textContent = margemEscanteios.toFixed(1);
        });
    }
});

















































