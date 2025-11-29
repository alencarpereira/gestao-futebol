/* script.js - Modelo Híbrido (Poisson + forças + heurísticas)
   Compatível com o HTML fornecido.
*/

let chartInstance = null;
let margemEscanteios = 1.5; // valor inicial (sincronizado no DOM quando carregar)

// --------------------------
// HELPERS MATH
// --------------------------
function mean(arr) {
    const valid = arr.filter(v => typeof v === 'number' && !Number.isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

// Poisson PMF (iterativo para estabilidade)
function poissonP(lambda, k) {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    // compute e^-lambda * lambda^k / k! iteratively
    let p = Math.exp(-lambda);
    let term = p;
    for (let i = 1; i <= k; i++) {
        term *= lambda / i;
    }
    return term; // equals P(X=k)
}

// CDF (probabilidade P(X <= k))
function poissonCdf(lambda, kMax) {
    let acc = 0;
    for (let k = 0; k <= kMax; k++) acc += poissonP(lambda, k);
    return acc;
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
// MODELO HÍBRIDO - LAMBDAS (expected goals)
// Estratégia:
//  - usa médias dos últimos jogos
//  - ajusta com diferença entre média própria e média de sofridos do adversário (meio caminho)
//  - garante lambda mínimo positivo
// --------------------------
function calcularLambdas(mediaGolsA, mediaSofridosA, mediaGolsB, mediaSofridosB) {
    // ajuste simples de força: combina média ofensiva com fraqueza defensiva adversária
    // lambdaA = média gols A + 0.5 * (média gols A - média sofridos B)
    // lambdaB = média gols B + 0.5 * (média gols B - média sofridos A)
    let lambdaA = mediaGolsA + 0.5 * (mediaGolsA - mediaSofridosB);
    let lambdaB = mediaGolsB + 0.5 * (mediaGolsB - mediaSofridosA);

    // suavização/limites
    lambdaA = Math.max(lambdaA, 0.10);
    lambdaB = Math.max(lambdaB, 0.10);

    return { lambdaA, lambdaB };
}

// --------------------------
// CONVOLUÇÃO: Probabilidade do total de gols = t
// P_total(t) = sum_{i=0..t} P_A(i) * P_B(t-i)
// --------------------------
function probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals = 10) {
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

// Prob(total >= k)
function probTotalAtLeast(lambdaA, lambdaB, k, maxGoals = 10) {
    const dist = probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals);
    let acc = 0;
    for (let t = k; t <= maxGoals; t++) acc += dist[t];
    // small tail beyond maxGoals: approximate by 1 - cdf(maxGoals)
    return Math.min(100, Math.round(acc * 100));
}

// Prob(total <= k)
function probTotalAtMost(lambdaA, lambdaB, k, maxGoals = 10) {
    const dist = probTotalGoalsDistribution(lambdaA, lambdaB, maxGoals);
    let acc = 0;
    for (let t = 0; t <= k; t++) acc += dist[t];
    return Math.min(100, Math.round(acc * 100));
}

// --------------------------
// PROBABILIDADES DE RESULTADO (Vitória, Empate, Derrota)
// Calcular por somatório P(A=i)*P(B=j) para i>j, i==j, i<j
// --------------------------
function winDrawLoseProb(lambdaA, lambdaB, maxGoals = 10) {
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
// BTTS (Ambos marcam)
// BTTS = 1 - P(A=0) - P(B=0) + P(A=0)*P(B=0) = 1 - P(A=0) - P(B=0) + P(A=0)P(B=0)
// com independência: simplifica para 1 - P(A=0) - P(B=0) + P(A=0)P(B=0)
// --------------------------
function probBTTS(lambdaA, lambdaB) {
    const pA0 = poissonP(lambdaA, 0);
    const pB0 = poissonP(lambdaB, 0);
    const btts = 1 - pA0 - pB0 + pA0 * pB0;
    return Math.min(100, Math.round(btts * 100));
}

// --------------------------
// ESCANTEIOS: usar Poisson com lambda = mediaEscA + mediaEscB
// Estimativa de intervalo com margem (slider)
// --------------------------
function probEscanteiosAtLeast(meanEscA, meanEscB, threshold = 5) {
    const lambda = Math.max(0.1, meanEscA + meanEscB);
    let acc = 0;
    // P(X >= threshold) = 1 - P(X <= threshold-1)
    for (let k = 0; k <= threshold - 1; k++) acc += poissonP(lambda, k);
    const p = 1 - acc;
    return Math.min(100, Math.round(p * 100));
}

function estimativaEscanteiosInterval(meanEscA, meanEscB, margem = 1.5) {
    const lambda = Math.max(0, meanEscA + meanEscB);
    // usar desvio padrão Poisson = sqrt(lambda)
    const desvio = Math.sqrt(lambda);
    const min = Math.max(0, Math.floor(lambda - desvio * margem));
    const max = Math.ceil(lambda + desvio * margem);
    return { min, max, lambda };
}

// --------------------------
// CARTÕES - heurística
// --------------------------
function probMaisDeDoisCartoes(meanCartA, meanCartB) {
    const mediaPorJogo = meanCartA + meanCartB; // média total por jogo
    // escalonar em relação a 6 cartões (arbitrário)
    const prob = Math.min(100, Math.round((mediaPorJogo / 6) * 100));
    return prob;
}

// --------------------------
// GERAR SUGESTÕES (ordenadas)
// --------------------------
function montarSugestoes(probabilidades) {
    // probabilidades: objeto com chaves nome->valor%
    const items = [];
    for (const key in probabilidades) {
        items.push({ name: key, prob: probabilidades[key] });
    }
    // ordenar desc
    items.sort((a, b) => b.prob - a.prob);
    return items.map(i => `${i.name}: ${i.prob}%`);
}

// --------------------------
// FUNÇÃO PRINCIPAL: calcular todas as probabilidades e exibir
// --------------------------
function calcularProbabilidades() {
    try {
        // checar se o formulário tem dados
        const anyInput = Array.from(document.querySelectorAll('input')).some(i => i.value.trim() !== '');
        if (!anyInput) {
            alert('Preencha pelo menos um campo (ou use Preencher Automático).');
            return;
        }

        const dados = coletarTodosDados();

        // médias
        const mediaGolsA = mean(dados.golsA);
        const mediaGolsB = mean(dados.golsB);
        const mediaSofA = mean(dados.sofridosA);
        const mediaSofB = mean(dados.sofridosB);

        const mediaEscA = mean(dados.escA);
        const mediaEscB = mean(dados.escB);

        const mediaCartA = mean(dados.cartA);
        const mediaCartB = mean(dados.cartB);

        // lambdas (esperados de gols) - híbrido
        const { lambdaA, lambdaB } = calcularLambdas(mediaGolsA, mediaSofA, mediaGolsB, mediaSofB);

        // probabilidades de total de gols
        const over15 = probTotalAtLeast(lambdaA, lambdaB, 2, 12); // >=2 gols -> +1.5
        const over25 = probTotalAtLeast(lambdaA, lambdaB, 3, 12); // >=3 gols -> +2.5
        const under35 = probTotalAtMost(lambdaA, lambdaB, 3, 12); // <=3 -> under 3.5 (-3.5)
        const over05 = probTotalAtLeast(lambdaA, lambdaB, 6, 12); // >=6 gols -> +5.5 (but we need +5 escanteios was for corners; ignore)

        // BTTS
        const btts = probBTTS(lambdaA, lambdaB);

        // vitórias
        const { pAwin, pDraw, pBwin } = winDrawLoseProb(lambdaA, lambdaB, 12);

        // escanteios
        const prob5Esc = probEscanteiosAtLeast(mediaEscA, mediaEscB, 5); // P(total esc >=5)
        const escInterval = estimativaEscanteiosInterval(mediaEscA, mediaEscB, dados.margemEsc);

        // cartões
        const probCart = probMaisDeDoisCartoes(mediaCartA, mediaCartB);

        // montar sugestões
        const probabilidadesObj = {
            '+1.5 gols (>=2)': over15,
            '+2.5 gols (>=3)': over25,
            'Ambos marcam': btts,
            'Vitória A': pAwin,
            'Empate': pDraw,
            'Vitória B': pBwin,
            '+5 escanteios (>=5)': prob5Esc,
            'Mais de 2 cartões': probCart
        };

        const sugestoesOrdenadas = montarSugestoes({
            '+1.5 gols': over15,
            'Ambos marcam': btts,
            '+2.5 gols': over25,
            'Vitória provável (A)': pAwin,
            'Vitória provável (B)': pBwin,
            '+5 escanteios': prob5Esc
        });

        // exibir
        const resultadoDiv = document.getElementById('resultado');
        resultadoDiv.innerHTML = `
      <h3>Resumo</h3>
      <p><strong>${dados.nomeA}</strong> — média gols: ${mediaGolsA.toFixed(2)}, média sofridos: ${mediaSofA.toFixed(2)}</p>
      <p><strong>${dados.nomeB}</strong> — média gols: ${mediaGolsB.toFixed(2)}, média sofridos: ${mediaSofB.toFixed(2)}</p>

      <p><strong>Lambda (A):</strong> ${lambdaA.toFixed(2)} — <strong>Lambda (B):</strong> ${lambdaB.toFixed(2)}</p>

      <p>Chance de <strong>+1.5 gols</strong>: <strong>${over15}%</strong></p>
      <p>Chance de <strong>+2.5 gols</strong>: <strong>${over25}%</strong></p>
      <p>Chance de <strong>Under 3.5 (≤3)</strong>: <strong>${under35}%</strong></p>

      <p>Probabilidade <strong>Ambos marcam</strong>: <strong>${btts}%</strong></p>

      <p>Probabilidades de resultado — <strong>${dados.nomeA}</strong>: ${pAwin}% | Empate: ${pDraw}% | <strong>${dados.nomeB}</strong>: ${pBwin}%</p>

      <p>Estimativa de escanteios (λ): ${escInterval.lambda.toFixed(2)} — intervalo: ${escInterval.min} a ${escInterval.max} (margem ${dados.margemEsc})</p>
      <p>Probabilidade de ≥5 escanteios: <strong>${prob5Esc}%</strong></p>

      <p>Média cartões/jogo: ${(mediaCartA + mediaCartB).toFixed(2)} — Probabilidade >2 cartões: <strong>${probCart}%</strong></p>

      <h4>Sugestões ordenadas</h4>
      <ul>
        ${sugestoesOrdenadas.map(s => `<li>${s}</li>`).join('')}
      </ul>
    `;

        // atualizar gráfico com: +1.5, +2.5, Ambos marcam, ≥5 escanteios
        atualizarGraficoChart({
            labels: ['+1.5', '+2.5', 'Ambos marcam', '≥5 escanteios'],
            data: [over15, over25, btts, prob5Esc],
            teams: [dados.nomeA, dados.nomeB]
        });
    } catch (err) {
        console.error('Erro em calcularProbabilidades():', err);
        alert('Ocorreu um erro. Veja console para detalhes.');
    }
}

// --------------------------
// GRÁFICO (Chart.js)
// --------------------------
function atualizarGraficoChart({ labels, data, teams }) {
    const ctx = document.getElementById('grafico');
    if (!ctx) return;
    const context = ctx.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    chartInstance = new Chart(context, {
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
    // exemplo mais variado
    document.getElementById('nomeTimeA').value = 'Palmeiras';
    document.getElementById('nomeTimeB').value = 'Corinthians';

    const sampleA = [2, 1, 3, 0, 1];
    const sampleB = [1, 1, 0, 2, 2];
    for (let i = 1; i <= 5; i++) {
        ['golsA', 'sofridosA', 'escanteiosA', 'escSofridosA', 'cartoesA'].forEach((p, idx) => {
            const val = idx === 0 ? sampleA[i - 1] : (idx === 1 ? (i % 2) : Math.floor(Math.random() * 6));
            const el = document.getElementById(`${p}${i}`);
            if (el) el.value = val;
        });
        ['golsB', 'sofridosB', 'escanteiosB', 'escSofridosB', 'cartoesB'].forEach((p, idx) => {
            const val = idx === 0 ? sampleB[i - 1] : (idx === 1 ? (i % 2) : Math.floor(Math.random() * 6));
            const el = document.getElementById(`${p}${i}`);
            if (el) el.value = val;
        });

        // confronto direto (placares)
        const cdA = Math.floor(Math.random() * 3);
        const cdB = Math.floor(Math.random() * 3);
        if (document.getElementById(`cdGolsA${i}`)) document.getElementById(`cdGolsA${i}`).value = cdA;
        if (document.getElementById(`cdGolsB${i}`)) document.getElementById(`cdGolsB${i}`).value = cdB;
    }

    // cartões exemplo
    for (let i = 1; i <= 5; i++) {
        const ca = document.getElementById(`cartoesA${i}`);
        const cb = document.getElementById(`cartoesB${i}`);
        if (ca) ca.value = Math.floor(Math.random() * 3);
        if (cb) cb.value = Math.floor(Math.random() * 3);
    }

    // atualizar UI
    document.getElementById('valorMargem').textContent = margemEscanteios.toFixed(1);
}

// --------------------------
// EVENT BINDING (DOMContentLoaded)
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
    // listeners de botões
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

    // margem slider
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

    // dica: preencher automaticamente para testes
    // preencherAutomaticamente();
});
















































