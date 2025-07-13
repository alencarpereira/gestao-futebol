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

function calcularDesvioPadrao(valores) {
    const media = calcularMedia(valores);
    const somaQuadrados = valores.reduce((acc, val) => acc + (val - media) ** 2, 0);
    return Math.sqrt(somaQuadrados / (valores.length - 1));
}

function calcularForcasDetalhadas(golsMarcados, golsSofridos, golsAdv, sofridosAdv, escanteios, escSofridos, escAdv, escSofridosAdv) {
    // Gols
    const FO = calcularMedia(golsMarcados);
    const FD = calcularMedia(golsSofridos);
    const FOAdv = calcularMedia(golsAdv);
    const FDAdv = calcularMedia(sofridosAdv);

    const poderOfensivoGols = FO - FDAdv;
    const poderDefensivoGols = FD - FOAdv;

    // Escanteios
    const escAtaque = calcularMedia(escanteios);
    const escDefesa = calcularMedia(escSofridos);
    const escAdvAtaque = calcularMedia(escAdv);
    const escAdvDefesa = calcularMedia(escSofridosAdv);

    const poderOfensivoEsc = escAtaque - escAdvDefesa;
    const poderDefensivoEsc = escDefesa - escAdvAtaque;

    // Pesos (gols e confrontos com mais peso)
    const pesoGolsAtaque = 0.8;
    const pesoGolsDefesa = 0.6;
    const pesoEscAtaque = 0.2;
    const pesoEscDefesa = 0.1;

    const forcaFinal =
        (poderOfensivoGols * pesoGolsAtaque - poderDefensivoGols * pesoGolsDefesa) +
        (poderOfensivoEsc * pesoEscAtaque - poderDefensivoEsc * pesoEscDefesa);

    return {
        FO,
        FD,
        escAtaque,
        escDefesa,
        poderOfensivoGols,
        poderDefensivoGols,
        poderOfensivoEsc,
        poderDefensivoEsc,
        forcaFinal,
    };
}

function compararMaisMenosGols(mediaTotalGols) {
    let chanceMais15 = 0;
    let chanceMenos35 = 0;

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

function calcularVantagemConfrontoDireto(vitoriasA, vitoriasB) {
    const total = vitoriasA + vitoriasB;
    if (total === 0) return 0;

    // Multiplica por 1.5 para dar mais peso às vitórias diretas
    return ((vitoriasA - vitoriasB) / total) * 1.5;
}

function calcularAmbosMarcamConfrontoDireto(cdA, cdB) {
    const total = Math.min(cdA.length, cdB.length);
    if (total === 0) return null;

    let jogosAmbosMarcaram = 0;
    for (let i = 0; i < total; i++) {
        if (cdA[i] > 0 && cdB[i] > 0) {
            jogosAmbosMarcaram++;
        }
    }

    return ((jogosAmbosMarcaram / total) * 100).toFixed(0);
}

function calcularChanceAmbosMarcam(mediaGolsA, mediaGolsB, mediaSofridosA, mediaSofridosB, cdA, cdB) {
    let score = 0;
    if (mediaGolsA > 1) score++;
    if (mediaGolsB > 1) score++;
    if (mediaSofridosA > 1) score++;
    if (mediaSofridosB > 1) score++;

    let chance = 25;
    if (score === 4) chance = 80;
    else if (score === 3) chance = 70;
    else if (score === 2) chance = 55;
    else if (score === 1) chance = 35;

    const confrontoChance = calcularAmbosMarcamConfrontoDireto(cdA, cdB);
    if (confrontoChance !== null) {
        chance = Math.round((chance * 0.6) + (Number(confrontoChance) * 0.4));
    }

    return chance;
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
    mediaSofridosB,
    chanceAmbosMarcam,
    mediaCartoesPorJogo
}) {
    const sugestoes = [];

    // Probabilidades % para gols e escanteios (simplificando para exemplo)
    let probMais15 = 0, probMais25 = 0, probMais5Esc = 0;

    // Ajuste simples para percentuais baseados na média (pode ajustar)
    if (mediaTotalGols > 2.5) probMais15 = 85;
    else if (mediaTotalGols > 2.0) probMais15 = 75;
    else if (mediaTotalGols > 1.5) probMais15 = 60;
    else probMais15 = 40;

    if (mediaTotalGols > 2.5) probMais25 = 80;
    else if (mediaTotalGols > 2.0) probMais25 = 60;
    else probMais25 = 40;

    probMais5Esc = mediaEscanteiosTotal > 5 ? 75 : 40;

    // Probabilidade de cartões com base na médiaCartoesPorJogo e fórmula proposta
    const probCartoes = Math.min(100, Math.round((mediaCartoesPorJogo / 6) * 100));

    // Sugestões formatadas com porcentagem
    sugestoes.push(`+1.5 gols: ${probMais15}% de chance`);
    sugestoes.push(`+2.5 gols: ${probMais25}% de chance`);
    sugestoes.push(`+5 escanteios: ${probMais5Esc}% de chance`);

    // Vitória provável
    if (Math.abs(forcaA - forcaB) >= 1) {
        const favorito = forcaA > forcaB ? nomeTimeA : nomeTimeB;
        sugestoes.push(`Vitória provável: ${favorito}`);
    } else {
        sugestoes.push('Vitória provável: Indefinida');
    }

    // Ambos marcam
    sugestoes.push(`Ambos marcam: ${chanceAmbosMarcam}% de chance`);

    // Cartões
    if (probCartoes > 0) {
        sugestoes.push(`Mais de 2 cartões: ${probCartoes}% de chance`);
    }

    return { sugestoes };
}



function exibirResultado(dados) {
    const {
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        totalGolsA,
        totalEscanteiosA,
        totalEscSofridosA,
        totalGolsB,
        totalEscanteiosB,
        totalEscSofridosB,
        chanceMais15,
        chanceMais25,
        chanceMais5Escanteios,
        resultado,
        forcaA,
        forcaB,
        resultadoConfronto = '',
        sugestoes = [],
        ambosMarcam = true,
        comparacaoGols,
        chanceAmbosMarcam = 0,
        estimativaEscanteios,
        mediaCartoesA = 0,
        mediaCartoesB = 0,
        mediaTotalCartoes = 0
    } = dados;

    const div = document.getElementById('resultado');
    div.innerHTML = `
        <p><strong>${nomeTimeA}</strong> — Média de gols: ${mediaGolsA.toFixed(2)}, Total de gols: ${totalGolsA}, Total de escanteios: ${totalEscanteiosA}, Escanteios sofridos: ${totalEscSofridosA}, Média cartões: ${mediaCartoesA}</p>
        <p><strong>${nomeTimeB}</strong> — Média de gols: ${mediaGolsB.toFixed(2)}, Total de gols: ${totalGolsB}, Total de escanteios: ${totalEscanteiosB}, Escanteios sofridos: ${totalEscSofridosB}, Média cartões: ${mediaCartoesB}</p>
        <p>Chance de +1.5 gols: <strong>${chanceMais15}</strong></p>
        <p>Chance de +2.5 gols: <strong>${chanceMais25}</strong></p>
        <p>Chance de +5 escanteios: <strong>${chanceMais5Escanteios}</strong></p>
        <p><strong>${resultado}</strong></p>
        ${resultadoConfronto}
        <p><strong>Probabilidade "Ambos Marcam":</strong> ${chanceAmbosMarcam}%</p>
        <p><strong>Probabilidade "Não Ambos Marcam":</strong> ${100 - chanceAmbosMarcam}%</p>
        <p><strong>${estimativaEscanteios}</strong></p>
        <p><strong>Média total de cartões no jogo:</strong> ${mediaTotalCartoes}</p>
    `;

    if (sugestoes.length > 0) {
        div.innerHTML += `<ul>${sugestoes.map(s => `<li>${s}</li>`).join('')}</ul>`;
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

function preencherAutomaticamente() {
    // Pode ser adaptado para preencher inputs com dados exemplo
    document.getElementById('nomeTimeA').value = 'Palmeiras';
    document.getElementById('nomeTimeB').value = 'Corinthians';
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsA${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosA${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`golsB${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosB${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`escanteiosA${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escSofridosA${i}`).value = Math.floor(Math.random() * 7);
        document.getElementById(`escanteiosB${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escSofridosB${i}`).value = Math.floor(Math.random() * 7);
        document.getElementById(`cdGolsA${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`cdGolsB${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`cartoesA${i}`).value = Math.floor(Math.random() * 5); // até 4 cartões
        document.getElementById(`cartoesB${i}`).value = Math.floor(Math.random() * 5);
    }
}

function calcularMedia(valores) {
    if (valores.length === 0) return 0;
    const soma = valores.reduce((acc, val) => acc + val, 0);
    return soma / valores.length;
}

function calcularDesvioPadrao(valores) {
    const media = calcularMedia(valores);
    const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length;
    return Math.sqrt(variancia);
}

let margemEscanteios = 1.0; // default

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



function calcularProbabilidades() {
    // Verifica se há algum campo preenchido
    const todosInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    const temValorPreenchido = Array.from(todosInputs).some(input => input.value.trim() !== '');

    if (!temValorPreenchido) {
        alert('Por favor, preencha ao menos um campo antes de calcular.');
        return;
    }

    // Nomes dos times
    const nomeTimeA = document.getElementById('nomeTimeA').value.trim() || 'Time A';
    const nomeTimeB = document.getElementById('nomeTimeB').value.trim() || 'Time B';

    // Pegando dados dos inputs
    const golsA = pegarDados('golsA');
    const sofridosA = pegarDados('sofridosA');
    const golsB = pegarDados('golsB');
    const sofridosB = pegarDados('sofridosB');
    const escanteiosA = pegarDados('escanteiosA');
    const escanteiosB = pegarDados('escanteiosB');
    const escSofridosA = pegarDados('escSofridosA');
    const escSofridosB = pegarDados('escSofridosB');
    const cdGolsA = pegarDadosConfrontoDireto('cdGolsA');
    const cdGolsB = pegarDadosConfrontoDireto('cdGolsB');

    // Cartões
    const cartoesA = pegarDados('cartoesA');
    const cartoesB = pegarDados('cartoesB');

    // Calcula médias
    const mediaGolsA = calcularMedia(golsA);
    const mediaSofridosA = calcularMedia(sofridosA);
    const mediaGolsB = calcularMedia(golsB);
    const mediaSofridosB = calcularMedia(sofridosB);
    const mediaEscanteiosA = calcularMedia(escanteiosA);
    const mediaEscanteiosB = calcularMedia(escanteiosB);
    const mediaEscSofridosA = calcularMedia(escSofridosA);
    const mediaEscSofridosB = calcularMedia(escSofridosB);
    // Média dos cartões, calculada corretamente
    const mediaCartoesA = calcularMedia(cartoesA);
    const mediaCartoesB = calcularMedia(cartoesB);

    // Totais
    const totalEscSofridosA = escSofridosA.reduce((acc, val) => acc + val, 0);
    const totalEscSofridosB = escSofridosB.reduce((acc, val) => acc + val, 0);
    const totalGolsA = golsA.reduce((acc, val) => acc + val, 0);
    const totalGolsB = golsB.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosA = escanteiosA.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosB = escanteiosB.reduce((acc, val) => acc + val, 0);
    const totalCartoesA = cartoesA.reduce((acc, val) => acc + val, 0);
    const totalCartoesB = cartoesB.reduce((acc, val) => acc + val, 0);

    // Médias totais
    const mediaTotalGols = (mediaGolsA + mediaGolsB + mediaSofridosA + mediaSofridosB) / 2;
    const mediaEscanteiosTotal = (mediaEscanteiosA + mediaEscanteiosB) / 2;
    const totalCartoesJogo = totalCartoesA + totalCartoesB;

    // Nova média dos cartões POR JOGO: soma total dividida por total de jogos (5 do time A + 5 do time B = 10)
    const mediaCartoesPorJogo = totalCartoesJogo / (cartoesA.length + cartoesB.length); // Divide por 10

    // Estimativa escanteios
    const estimativaEscanteios = estimarIntervaloEscanteios(escanteiosA, escanteiosB);

    // Chances básicas
    const chanceMais15 = mediaTotalGols > 1.5 ? "Alta" : "Baixa";
    const chanceMais25 = mediaTotalGols > 2.5 ? "Alta" : "Baixa";
    const chanceMais5Escanteios = mediaEscanteiosTotal > 5 ? "Alta" : "Baixa";

    // Forças detalhadas
    const forcaAcalc = calcularForcasDetalhadas(
        golsA, sofridosA, golsB, sofridosB,
        escanteiosA, escSofridosA, escanteiosB, escSofridosB
    );
    const forcaBcalc = calcularForcasDetalhadas(
        golsB, sofridosB, golsA, sofridosA,
        escanteiosB, escSofridosB, escanteiosA, escSofridosA
    );

    // Confronto direto
    let confronto = null;
    let resultadoConfronto = '';
    let vantagemConfronto = 0;

    if (cdGolsA.length && cdGolsB.length) {
        confronto = analisarConfrontoDireto(cdGolsA, cdGolsB);
        vantagemConfronto = calcularVantagemConfrontoDireto(confronto.vitoriasA, confronto.vitoriasB);

        resultadoConfronto = `
            <p><strong>Confronto Direto:</strong></p>
            <p>${nomeTimeA} venceu ${confronto.vitoriasA} vezes</p>
            <p>${nomeTimeB} venceu ${confronto.vitoriasB} vezes</p>
            <p>Empates: ${confronto.empates}</p>
        `;
    }

    // Combina forças e confronto direto
    const pesoGeral = 0.5;
    const pesoConfronto = 0.5;
    const forcaA = forcaAcalc.forcaFinal * pesoGeral + vantagemConfronto * pesoConfronto;
    const forcaB = forcaBcalc.forcaFinal * pesoGeral - vantagemConfronto * pesoConfronto;

    // Resultado provável
    let resultado;
    const diferencaForca = Math.abs(forcaA - forcaB);
    if (diferencaForca >= 1.0) {
        const favorito = forcaA > forcaB ? nomeTimeA : nomeTimeB;
        resultado = `${favorito} tem mais chances de vencer.`;
    } else {
        resultado = "Critério não atingido para vitória provável.";
    }

    // Comparação gols +1.5 vs -3.5
    const comparacaoGols = compararMaisMenosGols(mediaTotalGols);

    // Chance ambos marcam
    const chanceAmbosMarcam = calcularChanceAmbosMarcam(
        mediaGolsA,
        mediaGolsB,
        mediaSofridosA,
        mediaSofridosB,
        cdGolsA,
        cdGolsB
    );

    // Sugestões de apostas
    const { sugestoes } = gerarSugestoes({
        mediaTotalGols,
        mediaEscanteiosTotal,
        forcaA,
        forcaB,
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        mediaSofridosA,
        mediaSofridosB,
        chanceAmbosMarcam,
        mediaCartoesPorJogo
    });


    // Exibe resultado, agora com dados dos cartões (formatando para mostrar 2 casas decimais)
    exibirResultado({
        nomeTimeA,
        nomeTimeB,
        mediaGolsA,
        mediaGolsB,
        totalGolsA,
        totalEscanteiosA,
        totalEscSofridosA,
        totalGolsB,
        totalEscanteiosB,
        totalEscSofridosB,
        chanceMais15,
        chanceMais25,
        chanceMais5Escanteios,
        resultado,
        forcaA: forcaA.toFixed(2),
        forcaB: forcaB.toFixed(2),
        resultadoConfronto,
        sugestoes,
        ambosMarcam: chanceAmbosMarcam >= 60,
        comparacaoGols,
        chanceAmbosMarcam,
        estimativaEscanteios,

        // Dados de cartões para exibição
        mediaCartoesA: mediaCartoesA.toFixed(2),
        mediaCartoesB: mediaCartoesB.toFixed(2),
        totalCartoesA,
        totalCartoesB,
        mediaTotalCartoes: mediaCartoesPorJogo.toFixed(2), // <- média real por jogo
        totalCartoesSomados: totalCartoesA + totalCartoesB // <- total bruto somado
    });


    // Cria gráfico (não incluindo cartões)
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
    document.getElementById('preencher').addEventListener('click', preencherAutomaticamente);
    document.getElementById('margemEsc').addEventListener('input', (e) => {
        margemEscanteios = parseFloat(e.target.value);
        document.getElementById('valorMargem').textContent = margemEscanteios.toFixed(1);
    });

});

// cartoes





















