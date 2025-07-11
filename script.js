let chartInstance = null;

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

function compararMaisMenosGols(mediaTotalGols) {
    let chanceMais15 = 0;
    let chanceMenos35 = 0;

    // Simples lógica baseada na média de gols
    if (mediaTotalGols > 2.5) {
        chanceMais15 = 85;
        chanceMenos35 = 30;
    } else if (mediaTotalGols > 2.0) {
        chanceMais15 = 75;
        chanceMenos35 = 45;
    } else if (mediaTotalGols > 1.5) {
        chanceMais15 = 60;
        chanceMenos35 = 55;
    } else {
        chanceMais15 = 40;
        chanceMenos35 = 70;
    }

    const melhorOpcao = chanceMais15 > chanceMenos35 ? "+1.5 gols" : "-3.5 gols";

    return { chanceMais15, chanceMenos35, melhorOpcao };
}

function analisarConfrontoDireto(golsA, golsB) {
    let vitoriasA = 0, vitoriasB = 0, empates = 0;

    for (let i = 0; i < golsA.length; i++) {
        if (golsA[i] > golsB[i]) vitoriasA++;
        else if (golsB[i] > golsA[i]) vitoriasB++;
        else empates++;
    }

    return { vitoriasA, vitoriasB, empates };
}

function gerarSugestoes({
    mediaTotalGols,
    mediaEscanteiosTotal,
    forcaA,
    forcaB,
    nomeTimeA,
    nomeTimeB,
    mediaGolsA,
    mediaGolsB,
    mediaSofridosA,
    mediaSofridosB
}) {
    const sugestoes = [];

    if (mediaTotalGols > 1.0) {
        let porcentagemGols;
        if (mediaTotalGols > 2.5) porcentagemGols = 85;
        else if (mediaTotalGols > 2.0) porcentagemGols = 75;
        else if (mediaTotalGols > 1.5) porcentagemGols = 60;
        else porcentagemGols = 45;

        sugestoes.push(`Alta chance de +1.5 gols no jogo (${porcentagemGols}%)`);
    } else {
        sugestoes.push("Critério não atingido para +1.5 gols.");
    }

    const diferencaForca = Math.abs(forcaA - forcaB);
    if (diferencaForca >= 1.5) {
        const favorito = forcaA > forcaB ? nomeTimeA : nomeTimeB;
        let porcentagemVitoria;
        if (diferencaForca > 2.5) porcentagemVitoria = 85;
        else if (diferencaForca > 2.0) porcentagemVitoria = 75;
        else porcentagemVitoria = 65;

        sugestoes.push(`Alta chance de vitória do ${favorito} (${porcentagemVitoria}%)`);
    } else {
        sugestoes.push("Critério não atingido para vitória provável.");
    }

    if (mediaEscanteiosTotal > 4) {
        let porcentagemEscanteios;
        if (mediaEscanteiosTotal > 7) porcentagemEscanteios = 85;
        else if (mediaEscanteiosTotal > 6) porcentagemEscanteios = 70;
        else if (mediaEscanteiosTotal > 5) porcentagemEscanteios = 60;
        else porcentagemEscanteios = 45;

        sugestoes.push(`Chance de +5 escanteios no total (${porcentagemEscanteios}%)`);
    } else {
        sugestoes.push("Critério não atingido para escanteios.");
    }

    const ambosMarcam = (
        mediaGolsA > 1 && mediaSofridosB > 1 &&
        mediaGolsB > 1 && mediaSofridosA > 1
    );

    if (ambosMarcam) {
        sugestoes.push("Alta chance de ambos marcarem (ambos marcam)");
    } else {
        sugestoes.push("Critério não atingido para 'ambos marcam'.");
    }

    return { sugestoes, ambosMarcam };
}

function exibirResultado({
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
    forcaA,
    forcaB,
    resultadoConfronto = '',
    sugestoes = [],
    ambosMarcam = true,
    comparacaoGols
}) {
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

    if (sugestoes.length > 0) {
        div.innerHTML += `
        <p><strong>Sugestões baseadas nos dados:</strong></p>
        <ul>
            ${sugestoes.map(s => {
            const isPadrao = s.toLowerCase().includes("difícil prever");
            const isRisco = s.toLowerCase().includes("aposta arriscada");
            const isAmbos = s.toLowerCase().includes("ambos marcam");
            const hasPorcentagem = /\(\d+%\)/.test(s);

            let className = "";
            if (isPadrao) className = "aviso-padrao";
            else if (isRisco) className = "sugestao-risco";
            else if (isAmbos) className = "sugestao-ambos-marcam";
            else if (hasPorcentagem) className = "sugestao-com-prob";

            return `<li class="${className}">${s}</li>`;
        }).join('')}
        </ul>
        `;

        if (!ambosMarcam) {
            div.innerHTML += `
                <p class="aviso-erro">
                    A condição "ambos marcam" não é válida com os dados informados.
                </p>
            `;
        }
    }

    if (comparacaoGols) {
        div.innerHTML += `
      <div class="comparacao-probabilidades">
        <p>Comparação: +1.5 gols: ${comparacaoGols.chanceMais15}% | -3.5 gols: ${comparacaoGols.chanceMenos35}%</p>
        <p class="melhor-opcao">Melhor opção: ${comparacaoGols.melhorOpcao}</p>
      </div>
    `;
    }

}

function criarGrafico({ nomeTimeA, nomeTimeB, mediaGolsA, mediaGolsB, totalGolsA, totalGolsB, totalEscanteiosA, totalEscanteiosB }) {
    const ctx = document.getElementById('grafico').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Média de Gols', 'Total de Gols', 'Total de Escanteios'],
            datasets: [
                {
                    label: nomeTimeA,
                    data: [mediaGolsA, totalGolsA, totalEscanteiosA],
                    backgroundColor: 'rgba(34, 139, 34, 0.7)'
                },
                {
                    label: nomeTimeB,
                    data: [mediaGolsB, totalGolsB, totalEscanteiosB],
                    backgroundColor: 'rgba(220, 20, 60, 0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
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

function calcularProbabilidades() {
    const todosInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
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

    const chanceMais25 = mediaTotalGols > 2.5 ? "Alta" : mediaTotalGols > 2.0 ? "Média" : "Baixa";
    const chanceMais15 = mediaTotalGols > 1.5 ? "Alta" : mediaTotalGols > 1.0 ? "Média" : "Baixa";
    const chanceMais5Escanteios = mediaEscanteiosTotal > 5 ? "Alta" : mediaEscanteiosTotal > 3 ? "Média" : "Baixa";

    const forcaA = calcularForcasDetalhadas(golsA, sofridosA, golsB, sofridosB);
    const forcaB = calcularForcasDetalhadas(golsB, sofridosB, golsA, sofridosA);

    const resultado = forcaA.forcaFinal > forcaB.forcaFinal
        ? `${nomeTimeA} tem mais chances de vencer.`
        : forcaB.forcaFinal > forcaA.forcaFinal
            ? `${nomeTimeB} tem mais chances de vencer.`
            : "Jogo equilibrado, alta chance de empate.";

    let resultadoConfronto = '';
    if (cdGolsA.length && cdGolsB.length) {
        const confronto = analisarConfrontoDireto(cdGolsA, cdGolsB);
        resultadoConfronto = `
            <p><strong>Confronto Direto:</strong></p>
            <p>${nomeTimeA} venceu ${confronto.vitoriasA} vezes</p>
            <p>${nomeTimeB} venceu ${confronto.vitoriasB} vezes</p>
            <p>Empates: ${confronto.empates}</p>
        `;
    }

    const comparacaoGols = compararMaisMenosGols(mediaTotalGols);

    const { sugestoes, ambosMarcam } = gerarSugestoes({
        mediaTotalGols,
        mediaEscanteiosTotal,
        forcaA: forcaA.forcaFinal,
        forcaB: forcaB.forcaFinal,
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        mediaSofridosA,
        mediaSofridosB
    });

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
        resultadoConfronto,
        sugestoes,
        ambosMarcam,
        comparacaoGols
    });

    criarGrafico({
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        totalGolsA,
        totalGolsB,
        totalEscanteiosA,
        totalEscanteiosB
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formulario').addEventListener('submit', e => {
        e.preventDefault();
        calcularProbabilidades();
    });
    document.getElementById('limpar').addEventListener('click', limparFormulario);
});




















