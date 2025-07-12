let chartInstance = null;

// Pega valores dos inputs pelo prefixo e quantidade de jogos
function pegarDados(prefixo, jogos = 5) {
    const dados = [];
    for (let i = 1; i <= jogos; i++) {
        const valor = Number(document.getElementById(`${prefixo}${i}`).value) || 0;
        dados.push(valor);
    }
    return dados;
}

// Pega valores do confronto direto, validando números >= 0
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

// Calcula a média de um array de números
function calcularMedia(valores) {
    if (valores.length === 0) return 0;
    const soma = valores.reduce((acc, val) => acc + val, 0);
    return soma / valores.length;
}

// Função para calcular forças detalhadas dos times
function calcularForcasDetalhadas(golsMarcados, golsSofridos, golsAdversarioMarcados, golsAdversarioSofridos) {
    const mediaGolsMarcados = calcularMedia(golsMarcados);
    const mediaGolsSofridos = calcularMedia(golsSofridos);
    const mediaGolsAdversarioMarcados = calcularMedia(golsAdversarioMarcados);
    const mediaGolsAdversarioSofridos = calcularMedia(golsAdversarioSofridos);

    const forcaAtaque = mediaGolsMarcados;
    const forcaDefesa = mediaGolsSofridos;
    const forcaAdversarioAtaque = mediaGolsAdversarioMarcados;
    const forcaAdversarioDefesa = mediaGolsAdversarioSofridos;

    const forcaFinal = (forcaAtaque + forcaAdversarioDefesa) / 2 - (forcaDefesa + forcaAdversarioAtaque) / 2;

    return {
        forcaAtaque,
        forcaDefesa,
        forcaAdversarioAtaque,
        forcaAdversarioDefesa,
        forcaFinal
    };
}

// Função para comparar chances de +1.5 e -3.5 gols
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

// Análise do confronto direto (vitórias, empates)
function analisarConfrontoDireto(golsA, golsB) {
    let vitoriasA = 0, vitoriasB = 0, empates = 0;

    for (let i = 0; i < golsA.length; i++) {
        if (golsA[i] > golsB[i]) vitoriasA++;
        else if (golsB[i] > golsA[i]) vitoriasB++;
        else empates++;
    }

    return { vitoriasA, vitoriasB, empates };
}

// Calcula a chance "Ambos Marcam" baseado no confronto direto
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

// Calcula chance de "Ambos Marcam" com base em médias e confronto direto
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

// Gera sugestões baseadas nos dados calculados, incluindo cartões
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
    mediaCartoesAmarelosA,
    mediaCartoesAmarelosB,
    mediaCartoesVermelhosA,
    mediaCartoesVermelhosB
}) {
    const sugestoes = [];

    // +1.5 gols
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

    // Vitória provável
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

    // +5 escanteios
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

    // Ambos marcam
    if (chanceAmbosMarcam >= 60) {
        sugestoes.push(`Chance de ambos marcarem (${chanceAmbosMarcam}%)`);
    } else {
        sugestoes.push("Critério não atingido para 'ambos marcam'.");
    }

    // Cartões amarelos
    const mediaCartoesAmarelosTotal = (mediaCartoesAmarelosA + mediaCartoesAmarelosB) / 2;
    if (mediaCartoesAmarelosTotal > 3) {
        sugestoes.push(`Alerta: média alta de cartões amarelos (${mediaCartoesAmarelosTotal.toFixed(1)})`);
    } else {
        sugestoes.push("Cartões amarelos dentro da média.");
    }

    // Cartões vermelhos
    const mediaCartoesVermelhosTotal = (mediaCartoesVermelhosA + mediaCartoesVermelhosB) / 2;
    if (mediaCartoesVermelhosTotal > 0.5) {
        sugestoes.push(`Alerta: possibilidade de cartões vermelhos (média: ${mediaCartoesVermelhosTotal.toFixed(2)})`);
    } else {
        sugestoes.push("Cartões vermelhos raros nos últimos jogos.");
    }

    return { sugestoes, ambosMarcam: chanceAmbosMarcam >= 60 };
}

// Exibe resultado e sugestões no HTML
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
    chanceMais35,
    chanceMais5Escanteios,
    resultado,
    forcaA,
    forcaB,
    sugestoes = [],
    ambosMarcam = true,
    comparacaoGols,
    chanceAmbosMarcam = 0,
    probCartoes = 0
}) {
    const chanceNaoAmbosMarcam = 100 - chanceAmbosMarcam;

    const div = document.getElementById('resultado');
    div.innerHTML = `
        <p><strong>${nomeTimeA}</strong> — Média de gols: ${mediaGolsA.toFixed(2)}, Total de gols: ${totalGolsA}, Total de escanteios: ${totalEscanteiosA}, Força final: ${forcaA}</p>
        <p><strong>${nomeTimeB}</strong> — Média de gols: ${mediaGolsB.toFixed(2)}, Total de gols: ${totalGolsB}, Total de escanteios: ${totalEscanteiosB}, Força final: ${forcaB}</p>
        <p>Chance de +1.5 gols: <strong>${chanceMais15}%</strong></p>
        <p>Chance de +3.5 gols: <strong>${chanceMais35}%</strong></p>
        <p>Chance de +5 escanteios: <strong>${chanceMais5Escanteios}</strong></p>
        <p>Probabilidade de pelo menos 2 cartões: <strong>${probCartoes}%</strong></p>
        <p><strong>${resultado}</strong></p>

        <p><strong>Probabilidade "Ambos Marcam":</strong> ${chanceAmbosMarcam}%</p>
        <p><strong>Probabilidade "Não Ambos Marcam":</strong> ${chanceNaoAmbosMarcam}%</p>
    `;

    if (sugestoes.length > 0) {
        div.innerHTML += `
        <p><strong>Sugestões baseadas nos dados:</strong></p>
        <ul>
            ${sugestoes.map(s => `<li>${s}</li>`).join('')}
        </ul>
        `;

        if (!ambosMarcam) {
            div.innerHTML += `
            <div class="aviso-erro">
                A condição <strong>"ambos marcam"</strong> não é válida com os dados informados.
            </div>
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

// Cria gráfico usando Chart.js para comparar médias e totais dos times
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

// Limpa todos os inputs e resultado na tela
function limparFormulario() {
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => input.value = '');
    document.getElementById('resultado').innerHTML = '';
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// Função principal que executa o cálculo das probabilidades e exibe tudo
function calcularProbabilidades(event) {
    if (event) event.preventDefault();  // previne o submit padrão
    const todosInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    const temValorPreenchido = Array.from(todosInputs).some(input => input.value.trim() !== '');
    if (!temValorPreenchido) {
        alert('Por favor, preencha ao menos um campo para calcular.');
        return;
    }

    const nomeTimeA = document.getElementById('nomeTimeA').value.trim() || 'Time A';
    const nomeTimeB = document.getElementById('nomeTimeB').value.trim() || 'Time B';

    const golsA = pegarDados('golsA');
    const golsB = pegarDados('golsB');
    const sofridosA = pegarDados('sofridosA');
    const sofridosB = pegarDados('sofridosB');

    const escanteiosA = pegarDados('escanteiosA');
    const escanteiosB = pegarDados('escanteiosB');
    const escanteiosSofridosA = pegarDados('escanteiosSofridosA');
    const escanteiosSofridosB = pegarDados('escanteiosSofridosB');

    const cartoesAmarelosA = pegarDados('cartoesAmarelosA');
    const cartoesAmarelosB = pegarDados('cartoesAmarelosB');
    const cartoesVermelhosA = pegarDados('cartoesVermelhosA');
    const cartoesVermelhosB = pegarDados('cartoesVermelhosB');

    const cdGolsA = pegarDadosConfrontoDireto('cdGolsA');
    const cdGolsB = pegarDadosConfrontoDireto('cdGolsB');

    const mediaGolsA = calcularMedia(golsA);
    const mediaGolsB = calcularMedia(golsB);
    const mediaSofridosA = calcularMedia(sofridosA);
    const mediaSofridosB = calcularMedia(sofridosB);

    const mediaEscanteiosA = calcularMedia(escanteiosA);
    const mediaEscanteiosB = calcularMedia(escanteiosB);
    const mediaEscanteiosTotal = mediaEscanteiosA + mediaEscanteiosB;

    const mediaCartoesAmarelosA = calcularMedia(cartoesAmarelosA);
    const mediaCartoesAmarelosB = calcularMedia(cartoesAmarelosB);
    const mediaCartoesVermelhosA = calcularMedia(cartoesVermelhosA);
    const mediaCartoesVermelhosB = calcularMedia(cartoesVermelhosB);

    const totalGolsA = golsA.reduce((acc, val) => acc + val, 0);
    const totalGolsB = golsB.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosA = escanteiosA.reduce((acc, val) => acc + val, 0);
    const totalEscanteiosB = escanteiosB.reduce((acc, val) => acc + val, 0);

    // Força dos times
    const forcaA = ((mediaGolsA + mediaSofridosB) / 2 - (mediaSofridosA + mediaGolsB) / 2).toFixed(2);
    const forcaB = ((mediaGolsB + mediaSofridosA) / 2 - (mediaSofridosB + mediaGolsA) / 2).toFixed(2);

    const mediaTotalGols = mediaGolsA + mediaGolsB;

    // Calcular probabilidades
    const { chanceMais15, chanceMenos35, melhorOpcao } = compararMaisMenosGols(mediaTotalGols);

    // Chance de ambos marcam
    const chanceAmbosMarcam = calcularChanceAmbosMarcam(mediaGolsA, mediaGolsB, mediaSofridosA, mediaSofridosB, cdGolsA, cdGolsB);

    // Probabilidade de cartões — exemplo básico: chance de ter pelo menos 2 cartões amarelos em um jogo (simples média)
    const probCartoes = ((mediaCartoesAmarelosA + mediaCartoesAmarelosB) / 2).toFixed(1);

    // Gerar sugestões
    const { sugestoes, ambosMarcam } = gerarSugestoes({
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
        mediaCartoesAmarelosA,
        mediaCartoesAmarelosB,
        mediaCartoesVermelhosA,
        mediaCartoesVermelhosB
    });

    // Resultado principal
    const resultado = `Comparação: +1.5 gols: ${chanceMais15}% | -3.5 gols: ${chanceMenos35}% — Melhor opção: ${melhorOpcao}`;

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
        chanceMais35: chanceMenos35,
        chanceMais5Escanteios: mediaEscanteiosTotal.toFixed(1),
        resultado,
        forcaA,
        forcaB,
        sugestoes,
        ambosMarcam,
        comparacaoGols: { chanceMais15, chanceMenos35, melhorOpcao },
        chanceAmbosMarcam,
        probCartoes
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

// Função para preencher automaticamente com dados de exemplo
function preencherAutomaticamente() {
    // Time A
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsA${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosA${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`escanteiosA${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escanteiosSofridosA${i}`).value = Math.floor(Math.random() * 8);
        document.getElementById(`cartoesAmarelosA${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`cartoesVermelhosA${i}`).value = Math.floor(Math.random() * 2);
    }

    // Time B
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`golsB${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`sofridosB${i}`).value = Math.floor(Math.random() * 3);
        document.getElementById(`escanteiosB${i}`).value = Math.floor(Math.random() * 10);
        document.getElementById(`escanteiosSofridosB${i}`).value = Math.floor(Math.random() * 8);
        document.getElementById(`cartoesAmarelosB${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`cartoesVermelhosB${i}`).value = Math.floor(Math.random() * 2);
    }

    // Confronto direto
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`cdGolsA${i}`).value = Math.floor(Math.random() * 4);
        document.getElementById(`cdGolsB${i}`).value = Math.floor(Math.random() * 4);
    }
}

// Evento para os botões
document.getElementById('autoPreencher').addEventListener('click', preencherAutomaticamente);

document.getElementById('formulario').addEventListener('submit', calcularProbabilidades);

document.getElementById('limpar').addEventListener('click', limparFormulario);





























