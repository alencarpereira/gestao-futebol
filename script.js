function pegarDados(prefixo, jogos = 5) {
    const dados = [];
    for (let i = 1; i <= jogos; i++) {
        const valor = Number(document.getElementById(`${prefixo}${i}`).value) || 0;
        dados.push(valor);
    }
    return dados;
}

function pegarDadosConfrontoDireto(prefixo, jogos = 5) {
    const dados = [];
    for (let i = 1; i <= jogos; i++) {
        const valor = Number(document.getElementById(`${prefixo}${i}`).value);
        if (!isNaN(valor) && valor >= 0) {
            dados.push(valor);
        }
    }
    return dados;
}

function calcularMedia(valores) {
    if (valores.length === 0) return 0;
    const soma = valores.reduce((acc, val) => acc + val, 0);
    return soma / valores.length;
}

function calcularForcasDetalhadas(golsMarcados, golsSofridos, golsAdv, sofridosAdv) {
    const FO = calcularMedia(golsMarcados);
    const FD = calcularMedia(golsSofridos);
    const FOAdv = calcularMedia(golsAdv);
    const FDAdv = calcularMedia(sofridosAdv);

    const poderOfensivoRelativo = FO - FDAdv;
    const poderDefensivoRelativo = FD - FOAdv;

    const pesoAtaque = 0.6;
    const pesoDefesa = 0.4;

    const forcaFinal = poderOfensivoRelativo * pesoAtaque - poderDefensivoRelativo * pesoDefesa;

    return {
        FO,
        FD,
        poderOfensivoRelativo,
        poderDefensivoRelativo,
        forcaFinal,
    };
}

function probabilidadeMais25Gols(media) {
    return media > 2.5 ? "Alta" : media > 2.0 ? "Média" : "Baixa";
}

function probabilidadeMais15Gols(media) {
    return media > 1.5 ? "Alta" : media > 1.0 ? "Média" : "Baixa";
}

function probabilidadeMais5Escanteios(media) {
    return media > 5 ? "Alta" : media > 3 ? "Média" : "Baixa";
}

function analisarConfrontoDireto(golsA, golsB) {
    let vitoriasA = 0;
    let vitoriasB = 0;
    let empates = 0;

    for (let i = 0; i < golsA.length; i++) {
        if (golsA[i] > golsB[i]) {
            vitoriasA++;
        } else if (golsB[i] > golsA[i]) {
            vitoriasB++;
        } else {
            empates++;
        }
    }

    return { vitoriasA, vitoriasB, empates };
}

let chartInstance = null;

function calcularProbabilidades() {
    const todosInputs = document.querySelectorAll('input[type="number"]');
    const temValorPreenchido = Array.from(todosInputs).some(input => input.value.trim() !== '');

    if (!temValorPreenchido) {
        alert('Por favor, preencha ao menos um campo antes de calcular.');
        return;
    }

    const nomeTimeA = document.getElementById('nomeTimeA').value.trim() || 'Time A';
    const nomeTimeB = document.getElementById('nomeTimeB').value.trim() || 'Time B';

    const golsA = pegarDados('golsA');
    const sofridosA = pegarDados('sofridosA');
    const golsB = pegarDados('golsB');
    const sofridosB = pegarDados('sofridosB');
    const escanteiosA = pegarDados('escanteiosA');
    const escanteiosB = pegarDados('escanteiosB');

    const cdGolsA = pegarDadosConfrontoDireto('cdGolsA');
    const cdGolsB = pegarDadosConfrontoDireto('cdGolsB');

    const mediaGolsA = calcularMedia(golsA);
    const mediaSofridosA = calcularMedia(sofridosA);
    const mediaGolsB = calcularMedia(golsB);
    const mediaSofridosB = calcularMedia(sofridosB);
    const mediaEscanteiosA = calcularMedia(escanteiosA);
    const mediaEscanteiosB = calcularMedia(escanteiosB);

    const totalGolsA = golsA.reduce((acc, val) => acc + val, 0);
    const totalGolsB = golsB.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosA = escanteiosA.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosB = escanteiosB.reduce((acc, val) => acc + val, 0);

    const mediaTotalGols = (mediaGolsA + mediaGolsB + mediaSofridosA + mediaSofridosB) / 2;
    const mediaEscanteiosTotal = (mediaEscanteiosA + mediaEscanteiosB) / 2;

    const chanceMais25 = probabilidadeMais25Gols(mediaTotalGols);
    const chanceMais15 = probabilidadeMais15Gols(mediaTotalGols);
    const chanceMais5Escanteios = probabilidadeMais5Escanteios(mediaEscanteiosTotal);

    const forcaA = calcularForcasDetalhadas(golsA, sofridosA, golsB, sofridosB);
    const forcaB = calcularForcasDetalhadas(golsB, sofridosB, golsA, sofridosA);

    let resultado;
    if (forcaA.forcaFinal > forcaB.forcaFinal) {
        resultado = `${nomeTimeA} tem mais chances de vencer.`;
    } else if (forcaB.forcaFinal > forcaA.forcaFinal) {
        resultado = `${nomeTimeB} tem mais chances de vencer.`;
    } else {
        resultado = "Jogo equilibrado, alta chance de empate.";
    }

    let resultadoConfronto = '';
    if (cdGolsA.length > 0 && cdGolsB.length > 0) {
        const confronto = analisarConfrontoDireto(cdGolsA, cdGolsB);
        resultadoConfronto = `
            <p><strong>Confronto Direto:</strong></p>
            <p>${nomeTimeA} venceu ${confronto.vitoriasA} vezes</p>
            <p>${nomeTimeB} venceu ${confronto.vitoriasB} vezes</p>
            <p>Empates: ${confronto.empates}</p>
        `;
    }

    exibirResultado({
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        totalGolsA,
        totalEscanteiosA,
        totalGolsB,
        totalEscanteiosB,
        chanceMais15,
        chanceMais25,
        chanceMais5Escanteios,
        resultado,
        forcaA: forcaA.forcaFinal.toFixed(2),
        forcaB: forcaB.forcaFinal.toFixed(2),
        resultadoConfronto
    });

    criarGrafico({ nomeTimeA, nomeTimeB, mediaGolsA, mediaGolsB, totalGolsA, totalGolsB, totalEscanteiosA, totalEscanteiosB });
}

function exibirResultado({ nomeTimeA, nomeTimeB, mediaGolsA, mediaGolsB, totalGolsA, totalEscanteiosA, totalGolsB, totalEscanteiosB, chanceMais15, chanceMais25, chanceMais5Escanteios, resultado, forcaA, forcaB, resultadoConfronto = '' }) {
    const div = document.getElementById('resultado');
    div.innerHTML = `
    <p><strong>${nomeTimeA}</strong> — Média de gols: ${mediaGolsA.toFixed(2)}, Total de gols: ${totalGolsA}, Total de escanteios: ${totalEscanteiosA}, Força final: ${forcaA}</p>
    <p><strong>${nomeTimeB}</strong> — Média de gols: ${mediaGolsB.toFixed(2)}, Total de gols: ${totalGolsB}, Total de escanteios: ${totalEscanteiosB}, Força final: ${forcaB}</p>
    <p>Chance de +1.5 gols: <strong>${chanceMais15}</strong></p>
    <p>Chance de +2.5 gols: <strong>${chanceMais25}</strong></p>
    <p>Chance de +5 escanteios: <strong>${chanceMais5Escanteios}</strong></p>
    <p><strong>${resultado}</strong></p>
    ${resultadoConfronto}
  `;
}

function criarGrafico({ nomeTimeA, nomeTimeB, mediaGolsA, mediaGolsB, totalGolsA, totalGolsB, totalEscanteiosA, totalEscanteiosB }) {
    const ctx = document.getElementById('grafico').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Média de Gols', 'Total de Gols', 'Total de Escanteios'],
            datasets: [
                {
                    label: nomeTimeA,
                    data: [mediaGolsA, totalGolsA, totalEscanteiosA],
                    backgroundColor: 'rgba(34, 139, 34, 0.7)' // Verde
                },
                {
                    label: nomeTimeB,
                    data: [mediaGolsB, totalGolsB, totalEscanteiosB],
                    backgroundColor: 'rgba(220, 20, 60, 0.7)' // Vermelho
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function limparFormulario() {
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => input.value = '');
    document.getElementById('resultado').innerHTML = '';
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}











