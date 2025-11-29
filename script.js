// script.js — versão corrigida e completa
// =======================================================================
// CONFIGURAÇÕES
// =======================================================================
let chartInstance = null;
let margemEscanteios = 1.0; // default

// =======================================================================
// FUNÇÕES BÁSICAS
// =======================================================================
function pegarDados(prefixo, jogos = 5) {
    return Array.from({ length: jogos }, (_, i) => {
        return Number(document.getElementById(`${prefixo}${i + 1}`).value) || 0;
    });
}

function pegarDadosConfrontoDireto(prefixo, jogos = 5) {
    return Array.from({ length: jogos }, (_, i) => {
        const v = Number(document.getElementById(`${prefixo}${i + 1}`).value);
        return !isNaN(v) && v >= 0 ? v : null;
    }).filter(v => v !== null);
}

function calcularMedia(valores) {
    return valores && valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
}

function calcularDesvioPadrao(valores) {
    if (!valores || valores.length <= 1) return 0;
    const media = calcularMedia(valores);
    const soma = valores.reduce((acc, val) => acc + (val - media) ** 2, 0);
    return Math.sqrt(soma / (valores.length - 1));
}

// =======================================================================
// FORÇAS DOS TIMES (Gols + Escanteios)
// =======================================================================
function calcularForcasDetalhadas(gA, gsA, gB, gsB, escA, escSofA, escB, escSofB) {
    const FO = calcularMedia(gA);
    const FD = calcularMedia(gsA);
    const FOAdv = calcularMedia(gB);
    const FDAdv = calcularMedia(gsB);

    const poderOfG = FO - FDAdv;
    const poderDefG = FD - FOAdv;

    const escAtaque = calcularMedia(escA);
    const escDefesa = calcularMedia(escSofA);
    const escAtaqueAdv = calcularMedia(escB);
    const escDefAdv = calcularMedia(escSofB);

    const poderOfE = escAtaque - escDefAdv;
    const poderDefE = escDefesa - escAtaqueAdv;

    const forcaFinal =
        (poderOfG * 0.8 - poderDefG * 0.6) +
        (poderOfE * 0.2 - poderDefE * 0.1);

    return { FO, FD, poderOfG, poderDefG, poderOfE, poderDefE, forcaFinal };
}

// =======================================================================
// +1.5 vs -3.5 GOLS
// =======================================================================
function compararMaisMenosGols(mediaTotalGols) {
    let chanceMais15 = 0;
    let chanceMenos35 = 0;

    if (mediaTotalGols >= 2.7) {
        chanceMais15 = 88;
        chanceMenos35 = 22;
    } else if (mediaTotalGols >= 2.2) {
        chanceMais15 = 78;
        chanceMenos35 = 40;
    } else if (mediaTotalGols >= 1.8) {
        chanceMais15 = 62;
        chanceMenos35 = 55;
    } else {
        chanceMais15 = 40;
        chanceMenos35 = 70;
    }

    return {
        chanceMais15,
        chanceMenos35,
        melhorOpcao: chanceMais15 > chanceMenos35 ? "+1.5 gols" : "-3.5 gols"
    };
}

// =======================================================================
// CONFRONTO DIRETO
// =======================================================================
function analisarConfrontoDireto(golsA, golsB) {
    let vitoriasA = 0, vitoriasB = 0, empates = 0;
    const total = Math.min(golsA.length, golsB.length);
    for (let i = 0; i < total; i++) {
        if (golsA[i] > golsB[i]) vitoriasA++;
        else if (golsB[i] > golsA[i]) vitoriasB++;
        else empates++;
    }
    return { vitoriasA, vitoriasB, empates, total };
}

function calcularVantagemConfrontoDireto(vitoriasA, vitoriasB) {
    const total = vitoriasA + vitoriasB;
    if (total === 0) return 0;
    return ((vitoriasA - vitoriasB) / total) * 1.5;
}

// =======================================================================
// AMBOS MARCAM
// =======================================================================
function calcularAmbosMarcamConfrontoDireto(cdA, cdB) {
    const total = Math.min(cdA.length, cdB.length);
    if (total === 0) return null;
    let jogos = 0;
    for (let i = 0; i < total; i++) if ((cdA[i] || 0) > 0 && (cdB[i] || 0) > 0) jogos++;
    return Math.round((jogos / total) * 100);
}

function calcularChanceAmbosMarcam(mA, mB, sA, sB, cdA, cdB) {
    let score = 0;
    if (mA > 1) score++;
    if (mB > 1) score++;
    if (sA > 1) score++;
    if (sB > 1) score++;

    const base = [25, 35, 55, 70, 82][score] || 25;
    const confronto = calcularAmbosMarcamConfrontoDireto(cdA, cdB);

    if (confronto !== null) return Math.round(base * 0.6 + confronto * 0.4);
    return base;
}

// =======================================================================
// SUGESTÕES DE APOSTAS
// =======================================================================
function gerarSugestoes({
    nomeTimeA, nomeTimeB, mediaTotalGols,
    mediaEscanteiosTotal, forcaA, forcaB,
    chanceAmbosMarcam, mediaCartoesPorJogo
}) {
    const sugs = [];
    const probMais15 = mediaTotalGols >= 2.5 ? 85 :
        mediaTotalGols >= 2.0 ? 75 :
            mediaTotalGols >= 1.5 ? 60 : 40;

    const probMais25 = mediaTotalGols >= 2.5 ? 80 :
        mediaTotalGols >= 2.0 ? 60 : 40;

    const probEsc = mediaEscanteiosTotal > 5 ? 72 : 38;
    const probCartoes = Math.min(100, Math.round(mediaCartoesPorJogo * 16));

    sugs.push(`+1.5 gols: ${probMais15}% de chance`);
    sugs.push(`+2.5 gols: ${probMais25}% de chance`);
    sugs.push(`+5 escanteios: ${probEsc}% de chance`);
    sugs.push(`Ambos marcam: ${chanceAmbosMarcam}% de chance`);
    sugs.push(`Mais de 2 cartões: ${probCartoes}% de chance`);

    if (Math.abs(forcaA - forcaB) >= 1)
        sugs.push(`Vitória provável: ${forcaA > forcaB ? nomeTimeA : nomeTimeB}`);
    else
        sugs.push("Vitória provável: Indefinida");

    return { sugestoes: sugs };
}

// =======================================================================
// EXIBIR RESULTADOS
// =======================================================================
function exibirResultado(dados) {
    const div = document.getElementById("resultado");
    const {
        nomeTimeA, nomeTimeB,
        mediaGolsA, mediaGolsB, totalGolsA, totalGolsB,
        totalEscanteiosA, totalEscanteiosB,
        totalEscSofridosA, totalEscSofridosB,
        mediaCartoesA, mediaCartoesB, mediaCartoesTotal,
        chanceMais15, chanceMais25, chanceMais5Escanteios,
        chanceAmbosMarcam, confrontoTexto,
        sugestoes, estimativaEscanteios, comparacaoGols
    } = dados;

    div.innerHTML = `
        <p><strong>${nomeTimeA}</strong> — Média de gols: ${mediaGolsA.toFixed(2)}, Total de gols: ${totalGolsA}, Total escanteios: ${totalEscanteiosA}, Escanteios sofridos: ${totalEscSofridosA}, Cartões: ${mediaCartoesA}</p>
        <p><strong>${nomeTimeB}</strong> — Média de gols: ${mediaGolsB.toFixed(2)}, Total de gols: ${totalGolsB}, Total escanteios: ${totalEscanteiosB}, Escanteios sofridos: ${totalEscSofridosB}, Cartões: ${mediaCartoesB}</p>

        <p>Chance de +1.5 gols: <strong>${chanceMais15}%</strong></p>
        <p>Chance de +2.5 gols: <strong>${chanceMais25}%</strong></p>
        <p>Chance de +5 escanteios: <strong>${chanceMais5Escanteios}%</strong></p>

        ${confrontoTexto || ""}

        <p><strong>Ambos marcam:</strong> ${chanceAmbosMarcam}%</p>
        <p>${estimativaEscanteios}</p>
        <p>Média total de cartões: ${mediaCartoesTotal}</p>

        <ul>${(sugestoes || []).map(s => `<li>${s}</li>`).join("")}</ul>

        <p>Comparação: +1.5 gols ${comparacaoGols.chanceMais15}% | -3.5 gols ${comparacaoGols.chanceMenos35}%</p>
        <p><strong>Melhor opção: ${comparacaoGols.melhorOpcao}</strong></p>
    `;
}

// =======================================================================
// GRÁFICO
// =======================================================================
function criarGrafico({ nomeTimeA, nomeTimeB, mediaGolsA, mediaGolsB, totalGolsA, totalGolsB, totalEscA, totalEscB }) {
    const canvas = document.getElementById("grafico");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Média Gols", "Total Gols", "Total Escanteios"],
            datasets: [
                { label: nomeTimeA, data: [mediaGolsA, totalGolsA, totalEscA], backgroundColor: "rgba(34,139,34,0.7)" },
                { label: nomeTimeB, data: [mediaGolsB, totalGolsB, totalEscB], backgroundColor: "rgba(220,20,60,0.7)" }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// =======================================================================
// ESTIMATIVA DE ESCANTEIOS
// =======================================================================
function estimarIntervaloEscanteios(escanteiosA, escanteiosB, margem = margemEscanteios) {
    const totalJogos = Math.min(escanteiosA.length, escanteiosB.length);
    if (totalJogos === 0) return "Sem dados suficientes para estimar escanteios.";

    const totaisPorJogo = [];
    for (let i = 0; i < totalJogos; i++) {
        totaisPorJogo.push((escanteiosA[i] || 0) + (escanteiosB[i] || 0));
    }

    const mediaTotal = calcularMedia(totaisPorJogo);
    const desvioTotal = calcularDesvioPadrao(totaisPorJogo);

    const min = Math.max(0, Math.floor(mediaTotal - desvioTotal * margem));
    const max = Math.ceil(mediaTotal + desvioTotal * margem);

    return `Estimativa de escanteios no jogo: entre ${min} e ${max}`;
}

// =======================================================================
// LIMPAR / PREENCHER
// =======================================================================
function limparFormulario() {
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => input.value = '');
    document.getElementById('resultado').innerHTML = '';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function preencherAutomaticamente() {
    document.getElementById('nomeTimeA').value = 'Palmeiras';
    document.getElementById('nomeTimeB').value = 'Corinthians';
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsA${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosA${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`golsB${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosB${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`escA${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escSofA${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escB${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escSofB${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`cartA${i}`).value = Math.floor(Math.random() * 5);
        document.getElementById(`cartB${i}`).value = Math.floor(Math.random() * 5);
    }
}






















