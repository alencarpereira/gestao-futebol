// Função para calcular o Fatorial (necessário para a Distribuição de Poisson)
function fatorial(n) {
    if (n === 0 || n === 1) return 1;
    let resultado = 1;
    for (let i = 2; i <= n; i++) {
        resultado *= i;
    }
    return resultado;
}

// Distribuição de Poisson P(k, lambda)
// P(k): Probabilidade de ocorrer k eventos (gols/escanteios) dado o lambda (média)
function poisson(k, lambda) {
    // P(k, λ) = (e^(-λ) * λ^k) / k!
    if (lambda === 0) {
        return k === 0 ? 1 : 0; // Se a média é zero, a probabilidade de 0 eventos é 1 (100%)
    }
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / fatorial(k);
}

// Função principal para capturar dados e calcular médias
function calcularMedias(time) {
    const data = {};
    const stats = ['gols', 'sofridos', 'escanteios', 'escSofridos', 'cartoes'];
    let soma;

    stats.forEach(stat => {
        soma = 0;
        for (let i = 1; i <= 5; i++) {
            const id = `${stat}${time}${i}`;
            // Pega o valor, garante que é um número e que é no mínimo 0
            soma += parseFloat(document.getElementById(id).value) || 0;
        }
        data[stat] = soma;
        data[`media_${stat}`] = soma / 5;
    });

    return data;
}

// Função para calcular o histórico de confronto direto
function calcularConfrontoDireto() {
    let vitoriasA = 0;
    let vitoriasB = 0;
    let empates = 0;

    for (let i = 1; i <= 5; i++) {
        const golsA = parseFloat(document.getElementById(`cdGolsA${i}`).value) || 0;
        const golsB = parseFloat(document.getElementById(`cdGolsB${i}`).value) || 0;

        if (golsA > golsB) vitoriasA++;
        else if (golsB > golsA) vitoriasB++;
        else empates++;
    }

    return { vitoriasA, vitoriasB, empates };
}

// Função principal de cálculo e exibição ATUALIZADA COM FATOR CASA
function calcularProbabilidades(event) {
    event.preventDefault(); // Impede o recarregamento da página

    const nomeA = document.getElementById('nomeTimeA').value || 'Time A';
    const nomeB = document.getElementById('nomeTimeB').value || 'Time B';

    const dadosA = calcularMedias('A');
    const dadosB = calcularMedias('B');
    const confrontoDireto = calcularConfrontoDireto();
    const margemEsc = parseFloat(document.getElementById('margemEsc').value) || 1.0;

    // --- FATORES DE AJUSTE DO FATOR CASA (Definidos aqui) ---
    // Multiplicador para o ataque do time da casa (A)
    const fatorCasaAtaque = 1.10;
    // Multiplicador para a defesa do time visitante (B) - Desvantagem de jogar fora
    // Usamos 0.95 no cálculo do lambda B (Gols esperados do Visitante)
    const fatorCasaDefesaB = 0.95;

    // --- 1. CÁLCULO DE FORÇA OFENSIVA E DEFENSIVA (MODELO APERFEIÇOADO COM FATOR CASA) ---

    // Calcula a Média Geral de Gols
    const somaGols = dadosA.media_gols + dadosA.media_sofridos + dadosB.media_gols + dadosB.media_sofridos;
    const mediaGeral = somaGols / 4;

    let lambdaA, lambdaB;

    if (mediaGeral === 0) {
        lambdaA = 0.01;
        lambdaB = 0.01;
    } else {
        // Cálculo das Forças de Ataque e Defesa
        const forcaAtaqueA = dadosA.media_gols / mediaGeral;
        const forcaAtaqueB = dadosB.media_gols / mediaGeral;
        const forcaDefesaA = dadosA.media_sofridos / mediaGeral;
        const forcaDefesaB = dadosB.media_sofridos / mediaGeral;

        // Novo Lambda (Taxa de Gols Esperada) COM FATOR CASA

        // λA (Gols do Mandante): FA_A * FD_B * Média_Geral * Fator_Casa_Ataque
        // O FatorCasaAtaque bonifica o ataque do time da casa.
        lambdaA = forcaAtaqueA * forcaDefesaB * mediaGeral * fatorCasaAtaque;

        // λB (Gols do Visitante): FA_B * FD_A * Média_Geral * Fator_Casa_DefesaB
        // O FatorCasaDefesaB penaliza o ataque do time visitante por enfrentar o Mandante.
        lambdaB = forcaAtaqueB * forcaDefesaA * mediaGeral * fatorCasaDefesaB;
    }


    // --- 2. Probabilidades de Gols (Placares de 0x0 a 4x4) ---
    const MAX_GOLS = 4;
    let probVitoriaA = 0;
    let probVitoriaB = 0;
    let probEmpate = 0;
    let probPlacares = [];

    // Tabela de probabilidades e agregação
    for (let gA = 0; gA <= MAX_GOLS; gA++) {
        for (let gB = 0; gB <= MAX_GOLS; gB++) {
            const probGA = poisson(gA, lambdaA);
            const probGB = poisson(gB, lambdaB);
            const probPlacar = probGA * probGB; // Probabilidade do placar

            probPlacares.push({ placar: `${gA} x ${gB}`, probabilidade: probPlacar });

            if (gA > gB) probVitoriaA += probPlacar;
            else if (gB > gA) probVitoriaB += probPlacar;
            else probEmpate += probPlacar;
        }
    }

    // --- 3. Probabilidades Agregadas (Escanteios) ---
    const mediaEscanteiosTotal = dadosA.media_escanteios + dadosB.media_escanteios;
    const lambdaEscanteios = mediaEscanteiosTotal * margemEsc;

    let probUnder9_5 = 0;
    for (let k = 0; k <= 9; k++) {
        probUnder9_5 += poisson(k, lambdaEscanteios);
    }

    const probOver9_5 = 1 - probUnder9_5;


    // --- 4. Exibição dos Resultados ---
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = ''; // Limpa resultados anteriores

    let htmlResultado = '<h3>Médias dos Times (Últimos 5 Jogos)</h3>';
    htmlResultado += `
        <table>
            <thead>
                <tr>
                    <th>Estatística</th>
                    <th>${nomeA}</th>
                    <th>${nomeB}</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Gols Marcados</td><td>${dadosA.media_gols.toFixed(2)}</td><td>${dadosB.media_gols.toFixed(2)}</td></tr>
                <tr><td>Gols Sofridos</td><td>${dadosA.media_sofridos.toFixed(2)}</td><td>${dadosB.media_sofridos.toFixed(2)}</td></tr>
                <tr><td>Escanteios Pró</td><td>${dadosA.media_escanteios.toFixed(2)}</td><td>${dadosB.media_escanteios.toFixed(2)}</td></tr>
                <tr><td>Escanteios Contra</td><td>${dadosA.media_escSofridos.toFixed(2)}</td><td>${dadosB.media_escSofridos.toFixed(2)}</td></tr>
                <tr><td>Cartões</td><td>${dadosA.media_cartoes.toFixed(2)}</td><td>${dadosB.media_cartoes.toFixed(2)}</td></tr>
            </tbody>
        </table>
    `;

    // Probabilidades Principais (Placar Final)
    htmlResultado += '<h3>Probabilidades de Resultado (Poisson Estimado - Modelo de Forças + Casa)</h3>';
    htmlResultado += `
        <p><strong>Vitória ${nomeA}:</strong> ${(probVitoriaA * 100).toFixed(1)}%</p>
        <p><strong>Empate:</strong> ${(probEmpate * 100).toFixed(1)}%</p>
        <p><strong>Vitória ${nomeB}:</strong> ${(probVitoriaB * 100).toFixed(1)}%</p>
        <p class="nota"><em>Lambdas Ajustados (Gols): ${nomeA}: ${lambdaA.toFixed(2)} | ${nomeB}: ${lambdaB.toFixed(2)} (Média Geral: ${mediaGeral.toFixed(2)})</em></p>
    `;

    // Probabilidades Secundárias (Escanteios)
    htmlResultado += '<h3>Probabilidades de Escanteios (Baseado em Média e Margem)</h3>';
    htmlResultado += `
        <p><strong>Média Total de Escanteios Esperada:</strong> ${mediaEscanteiosTotal.toFixed(1)}</p>
        <p><strong>Prob. OVER 9.5 Escanteios:</strong> ${(probOver9_5 * 100).toFixed(1)}%</p>
        <p><strong>Prob. UNDER 9.5 Escanteios:</strong> ${(probUnder9_5 * 100).toFixed(1)}%</p>
    `;

    // Confronto Direto
    htmlResultado += '<h3>Histórico Recente de Confronto Direto (Últimos 5)</h3>';
    htmlResultado += `
        <p><strong>Vitórias ${nomeA}:</strong> ${confrontoDireto.vitoriasA}</p>
        <p><strong>Empates:</strong> ${confrontoDireto.empates}</p>
        <p><strong>Vitórias ${nomeB}:</strong> ${confrontoDireto.vitoriasB}</p>
    `;

    resultadoDiv.innerHTML = htmlResultado;

    // 5. Exibir Gráfico
    probPlacares.sort((a, b) => b.probabilidade - a.probabilidade);
    const topPlacares = probPlacares.slice(0, 5); // Os 5 placares mais prováveis

    renderizarGrafico(nomeA, nomeB, topPlacares);
}

// Função para renderizar o Chart.js
let graficoChart; // Variável global para destruir o gráfico anterior
function renderizarGrafico(nomeA, nomeB, topPlacares) {
    const ctx = document.getElementById('grafico').getContext('2d');

    if (graficoChart) {
        graficoChart.destroy(); // Destrói o gráfico anterior antes de criar um novo
    }

    graficoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPlacares.map(p => p.placar),
            datasets: [{
                label: `Top 5 Placares Mais Prováveis (${nomeA} vs ${nomeB})`,
                data: topPlacares.map(p => (p.probabilidade * 100).toFixed(1)),
                backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'],
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Probabilidade (%)'
                    }
                }
            }
        }
    });
}

// Função para preencher automaticamente (para testes)
function preencherAutomatico() {
    document.getElementById('nomeTimeA').value = "Time Mandante";
    document.getElementById('nomeTimeB').value = "Time Visitante";

    // Dados de exemplo (Mandante forte, Visitante mediano)
    const dadosA = [2, 1, 3, 2, 1]; // Gols Marcados A
    const sofridosA = [1, 0, 1, 2, 0]; // Gols Sofridos A
    const escA = [6, 8, 5, 7, 6];
    const escSofridosA = [4, 5, 3, 6, 4];
    const cartoesA = [2, 3, 1, 2, 4];

    const dadosB = [1, 0, 2, 1, 1]; // Gols Marcados B
    const sofridosB = [2, 1, 1, 3, 2]; // Gols Sofridos B
    const escB = [4, 6, 5, 5, 7];
    const escSofridosB = [7, 6, 8, 5, 5];
    const cartoesB = [3, 2, 4, 1, 2];

    const cdA = [1, 2, 0, 3, 1]; // Confronto Direto Gols A
    const cdB = [2, 1, 0, 0, 1]; // Confronto Direto Gols B

    // Preenchendo Time A
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsA${i}`).value = dadosA[i - 1];
        document.getElementById(`sofridosA${i}`).value = sofridosA[i - 1];
        document.getElementById(`escanteiosA${i}`).value = escA[i - 1];
        document.getElementById(`escSofridosA${i}`).value = escSofridosA[i - 1];
        document.getElementById(`cartoesA${i}`).value = cartoesA[i - 1];
    }
    // Preenchendo Time B
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsB${i}`).value = dadosB[i - 1];
        document.getElementById(`sofridosB${i}`).value = sofridosB[i - 1];
        document.getElementById(`escanteiosB${i}`).value = escB[i - 1];
        document.getElementById(`escSofridosB${i}`).value = escSofridosB[i - 1];
        document.getElementById(`cartoesB${i}`).value = cartoesB[i - 1];
    }
    // Preenchendo Confronto Direto
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`cdGolsA${i}`).value = cdA[i - 1];
        document.getElementById(`cdGolsB${i}`).value = cdB[i - 1];
    }
}

// Função para limpar todos os campos
function limparDados() {
    document.getElementById('formulario').reset();
    document.getElementById('resultado').innerHTML = '';
    document.getElementById('nomeTimeA').value = '';
    document.getElementById('nomeTimeB').value = '';
    document.getElementById('margemEsc').value = '1.0'; // Padrão ajustado para 1.0
    document.getElementById('valorMargem').textContent = '1.0';

    if (graficoChart) {
        graficoChart.destroy();
    }
}

// Função para atualizar o valor da margem no slider
function atualizarMargemSlider() {
    const margemEsc = document.getElementById('margemEsc').value;
    document.getElementById('valorMargem').textContent = margemEsc;

    // Recalcula as probabilidades automaticamente após mover o slider
    const calcularBtn = document.getElementById('calcular');
    if (calcularBtn) {
        calcularProbabilidades({ preventDefault: () => { } });
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario');
    const botaoPreencher = document.getElementById('preencher');
    const botaoLimpar = document.getElementById('limpar');
    const sliderMargem = document.getElementById('margemEsc');

    // Associa a função de cálculo ao envio do formulário
    formulario.addEventListener('submit', calcularProbabilidades);

    // Associa funções aos botões
    botaoPreencher.addEventListener('click', preencherAutomatico);
    botaoLimpar.addEventListener('click', limparDados);

    // Associa a atualização do texto e recalcula no input do slider
    sliderMargem.addEventListener('input', atualizarMargemSlider);

    // Garante que o cálculo ocorra ao carregar os dados iniciais
    if (sliderMargem) {
        atualizarMargemSlider();
    }
});

















































