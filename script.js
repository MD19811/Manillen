const suits = ['Harten', 'Ruiten', 'Klaveren', 'Schoppen'];
const values = [
    { name: '7', pts: 0, rank: 1 }, { name: '8', pts: 0, rank: 2 },
    { name: '9', pts: 0, rank: 3 }, { name: 'J', pts: 1, rank: 4 },
    { name: 'Q', pts: 2, rank: 5 }, { name: 'K', pts: 3, rank: 6 },
    { name: 'A', pts: 4, rank: 7 }, { name: '10', pts: 5, rank: 8 }
];

let deck = [], players = { user: [], bot2: [], bot3: [], bot4: [] };
let currentTrick = [], scores = { teamA: 0, teamB: 0 }, trickCounts = { teamA: 0, teamB: 0 };
let currentTrump = "", currentPlayer = "";
// Nieuwe globale variabelen voor de totaalscore (tot 100)
let totalScores = { teamA: 0, teamB: 0 };

function getSuitInfo(s) {
    const icons = { 'Harten': '&hearts;', 'Ruiten': '&diams;', 'Klaveren': '&clubs;', 'Schoppen': '&spades;' };
    return { icon: icons[s], class: (s === 'Harten' || s === 'Ruiten') ? 'suit-red' : 'suit-black' };
}

function initGame() {
    document.getElementById('start-btn').classList.add('hidden');

    // RESET enkel de scores van de huidige ronde en de slagen
    scores = { teamA: 0, teamB: 0 };
    trickCounts = { teamA: 0, teamB: 0 };

    // Deck maken en schudden...
    deck = []; let n = 1;
    suits.forEach(s => values.forEach(v => {
        deck.push({ suit: s, name: v.name, pts: v.pts, rank: v.rank, img: `randomM/${n.toString().padStart(2, '0')}.jpg` });
        n++;
    }));

    for(let i=deck.length-1; i>0; i--) {
        const j=Math.floor(Math.random()*(i+1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    players.user = sortHand(deck.slice(0, 8));
    players.bot2 = deck.slice(8, 16);
    players.bot3 = deck.slice(16, 24);
    players.bot4 = deck.slice(24, 32);

    currentTrick = [];
    document.getElementById('trump-modal').style.display = 'flex';

    // Zorg dat de UI de huidige (totaal)stand toont
    updateScoreUI();
    render();
}

function selectTrump(s) {
    currentTrump = s;
    const info = getSuitInfo(s);
    document.getElementById('current-trump').innerHTML = `<span class="${info.class}">${s} ${info.icon}</span>`;
    document.getElementById('trump-modal').style.display = 'none';
    currentPlayer = "user";
    updateTurnIndicator();
}

function render() {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = '';

    const lead = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
    const currentBest = getCurrentWinner();
    const partnerIsWinning = currentBest && currentBest.player === 'bot3';

    players.user.forEach((c, i) => {
        // Gebruik de createCardUI helper
        const cardEl = createCardUI(c, () => {
            if(currentPlayer === 'user') {
                // Regel check
                let canPlay = true;
                if (lead) {
                    const hasLeadSuit = players.user.some(card => card.suit === lead);
                    const hasTrump = players.user.some(card => card.suit === currentTrump);
                    if (hasLeadSuit) { if (c.suit !== lead) canPlay = false; }
                    else if (hasTrump && !partnerIsWinning) { if (c.suit !== currentTrump) canPlay = false; }
                }
                if(canPlay) playUserCard(i);
                else alert("Je moet bekennen of kopen!");
            }
        });

        // Visuele hulp voor speelbare kaarten
        const leadSuit = lead;
        if (currentPlayer === "user") {
            const hasLead = players.user.some(card => card.suit === leadSuit);
            if (!leadSuit || (hasLead && c.suit === leadSuit) || (!hasLead)) {
                cardEl.classList.add('must-play');
            }
        }

        handDiv.appendChild(cardEl);
    });

    const tableDiv = document.getElementById('played-cards-area');
    tableDiv.innerHTML = '';
    currentTrick.forEach((p) => {
        const el = createCardUI(p.card);
        const order = ['user', 'bot2', 'bot3', 'bot4'];
        const angles = [0, 90, 180, 270];
        const angle = angles[order.indexOf(p.player)];
        el.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-60px) rotate(-${angle}deg)`;
        tableDiv.appendChild(el);
    });
    updateScoreUI();
}

function createCardUI(card, onClick) {
    const div = document.createElement('div');
    div.className = 'card-container';
    if(onClick) div.onclick = onClick;

    const info = getSuitInfo(card.suit);
    div.innerHTML = `
        <img src="${card.img}" class="card-img">
        <div class="card-label top-left ${info.class}"><span>${card.name}</span><span>${info.icon}</span></div>
        <div class="card-label bottom-right ${info.class}"><span>${card.name}</span><span>${info.icon}</span></div>
    `;
    return div;
}

function sortHand(hand) {
    const suitOrder = { 'Harten': 0, 'Ruiten': 1, 'Klaveren': 2, 'Schoppen': 3 };
    return hand.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
        return b.rank - a.rank;
    });
}

function playUserCard(i) {
    currentTrick.push({ player: 'user', card: players.user.splice(i, 1)[0] });
    render();
    currentPlayer = "bot2";
    checkTrickEnd();
}

// ... de rest van de botPlay, resolveTrick etc functies blijven gelijk ...
function getCurrentWinner() {
    if (currentTrick.length === 0) return null;
    let bestPlay = currentTrick[0];
    const lead = currentTrick[0].card.suit;
    for (let i = 1; i < currentTrick.length; i++) {
        let p = currentTrick[i];
        let isBetter = false;
        if (p.card.suit === currentTrump) {
            if (bestPlay.card.suit !== currentTrump || p.card.rank > bestPlay.card.rank) isBetter = true;
        } else if (bestPlay.card.suit !== currentTrump && p.card.suit === lead && p.card.rank > bestPlay.card.rank) {
            isBetter = true;
        }
        if (isBetter) bestPlay = p;
    }
    return bestPlay;
}

function updateTurnIndicator() {
    const el = document.getElementById('turn-indicator');
    if(currentPlayer === 'user') {
        el.innerText = "Jouw beurt!"; el.style.color = "gold";
    } else {
        el.innerText = `Bot speelt...`; el.style.color = "white";
        setTimeout(botPlay, 800);
    }
}

function botPlay() {
    const hand = players[currentPlayer];
    const lead = currentTrick.length > 0 ? currentTrick[0].card.suit : null;
    let idx = lead ? hand.findIndex(c => c.suit === lead) : -1;
    if (idx === -1) idx = 0;
    currentTrick.push({ player: currentPlayer, card: hand.splice(idx, 1)[0] });
    render();
    const order = ['user', 'bot2', 'bot3', 'bot4'];
    currentPlayer = order[(order.indexOf(currentPlayer) + 1) % 4];
    checkTrickEnd();
}

function checkTrickEnd() {
    if (currentTrick.length === 4) setTimeout(resolveTrick, 1000);
    else updateTurnIndicator();
}

function resolveTrick() {
    const tableDiv = document.getElementById('played-cards-area');
    const cardsOnTable = tableDiv.querySelectorAll('.card-container');
    const winner = getCurrentWinner().player;
    const pts = currentTrick.reduce((s, p) => s + p.card.pts, 0);

    // Animatie naar de winnaar
    cardsOnTable.forEach(cardEl => {
        cardEl.classList.add(`win-${winner}`);
    });

    setTimeout(() => {
        // Punten van de slag bij de ronde-score tellen
        if (winner === 'user' || winner === 'bot3') {
            scores.teamA += pts;
            trickCounts.teamA++;
        } else {
            scores.teamB += pts;
            trickCounts.teamB++;
        }

        currentTrick = [];
        currentPlayer = winner;
        render();

        // Check of de ronde (8 slagen) gedaan is
        if (players.user.length === 0) {
            finishRound();
        } else {
            updateTurnIndicator();
        }
    }, 600);
}

function calculateRoundWinner() {
    let message = `Ronde gedaan! Score: ${scores.teamA} - ${scores.teamB}\n`;

    // Enkel punten boven de 30 tellen voor de winnaar
    if (scores.teamA > 30) {
        let earned = scores.teamA - 30;
        totalScores.teamA += earned;
        message += `Jullie team wint ${earned} punten!`;
    } else if (scores.teamB > 30) {
        let earned = scores.teamB - 30;
        totalScores.teamB += earned;
        message += `De bots winnen ${earned} punten!`;
    } else {
        message += "Gelijkspel (30-30)! Niemand krijgt punten.";
    }

    // Update de UI met de totaalscores (0-100)
    document.getElementById('score-teamA').innerText = totalScores.teamA;
    document.getElementById('score-teamB').innerText = totalScores.teamB;

    // Check of iemand 100 heeft bereikt
    if (totalScores.teamA >= 100 || totalScores.teamB >= 100) {
        const winnerText = totalScores.teamA >= 100 ? "Jullie hebben gewonnen!" : "De bots hebben gewonnen!";
        alert(`GAME OVER! ${winnerText}\nEindstand: ${totalScores.teamA} - ${totalScores.teamB}`);
        // Reset alles voor een volledig nieuw spel
        totalScores = { teamA: 0, teamB: 0 };
        document.getElementById('start-btn').classList.remove('hidden');
    } else {
        alert(message + `\nTotaalstand: ${totalScores.teamA} - ${totalScores.teamB}`);
        initGame(); // Start direct een nieuwe ronde
    }
}

function finishRound() {
    let rondePuntenA = 0;
    let rondePuntenB = 0;

    // Manille regel: enkel punten boven de 30 tellen
    if (scores.teamA > 30) {
        rondePuntenA = scores.teamA - 30;
        totalScores.teamA += rondePuntenA;
    } else if (scores.teamB > 30) {
        rondePuntenB = scores.teamB - 30;
        totalScores.teamB += rondePuntenB;
    }

    updateScoreUI();

    let resultMsg = `Ronde gedaan! \nScore deze ronde: ${scores.teamA} - ${scores.teamB}\n`;
    if (rondePuntenA > 0) resultMsg += `Jullie team krijgt ${rondePuntenA} punten.`;
    else if (rondePuntenB > 0) resultMsg += `De bots krijgen ${rondePuntenB} punten.`;
    else resultMsg += "Gelijkspel! Geen punten deze ronde.";

    // Check of iemand 100 heeft
    if (totalScores.teamA >= 100 || totalScores.teamB >= 100) {
        const winner = totalScores.teamA >= 100 ? "Jullie" : "De bots";
        alert(`${resultMsg}\n\nGEFELICITEERD! ${winner} hebben het spel gewonnen!`);
        totalScores = { teamA: 0, teamB: 0 };
        document.getElementById('start-btn').classList.remove('hidden');
    } else {
        alert(`${resultMsg}\n\nTussenstand: ${totalScores.teamA} - ${totalScores.teamB}`);
        initGame(); // Start automatisch de volgende ronde
    }
}

function updateScoreUI() {
    // We tonen hier de totalScores (de stand tot 100)
    document.getElementById('score-teamA').innerText = totalScores.teamA;
    document.getElementById('score-teamB').innerText = totalScores.teamB;

    // De slag-tellers tonen we voor de huidige ronde
    document.getElementById('tricks-A').innerText = trickCounts.teamA;
    document.getElementById('tricks-B').innerText = trickCounts.teamB;
}