import React, { useState, useEffect, useMemo } from 'react';

// --- IKONER (SVG) ---
const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
const FootballIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.32 8.65-2.34 2.34-2.34-2.34-2.34 2.34-2.34-2.34-2.34 2.34 2.34 2.34 2.34-2.34 2.34 2.34 2.34-2.34 2.34 2.34-2.34-2.34"/><path d="m16.32 15.35 2.34-2.34-2.34-2.34"/><path d="M8.65 8.65 6.31 6.31"/><path d="m15.35 16.32 2.34 2.34"/><path d="M8.65 15.35 6.31 17.69"/><path d="m12 12-2.34-2.34"/></svg>
);
const ChevronDown = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);


// --- Huvudkomponent: App ---
export default function App() {
    const [participants, setParticipants] = useState([]);
    const [matches, setMatches] = useState([]);
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Datainhämtning från lokala JSON-filer ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Sökvägar till dina lokala JSON-filer i 'public'-mappen
                const dataPaths = [
                    '/data/participants.json',
                    '/data/matches.json',
                    '/data/bets.json',
                    '/data/results.json'
                ];

                const responses = await Promise.all(
                    dataPaths.map(path => fetch(path))
                );

                for (const res of responses) {
                    if (!res.ok) {
                        throw new Error(`Kunde inte ladda datafil: ${res.url}. Status: ${res.status}`);
                    }
                }
                
                const [participantsData, matchesData, betsData, resultsData] = await Promise.all(
                    responses.map(res => res.json())
                );

                // Slå ihop matchdata med resultatdata
                const matchesWithResults = matchesData.map(match => {
                    const result = resultsData.find(r => r.matchId === match.id);
                    if (result) {
                        return {
                            ...match,
                            status: 'FINISHED',
                            actualHomeScore: result.actualHomeScore,
                            actualAwayScore: result.actualAwayScore
                        };
                    }
                    return { ...match, status: 'UPCOMING' };
                });

                setParticipants(participantsData);
                setMatches(matchesWithResults.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate)));
                setBets(betsData);

            } catch (err) {
                console.error("Fel vid laddning av data:", err);
                setError("Kunde inte ladda all nödvändig data. Kontrollera att JSON-filerna finns i /public/data/ och är korrekt formaterade.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Poängberäkning ---
    const leaderboardData = useMemo(() => {
        if (!participants.length || !matches.length || !bets.length) {
            return [];
        }

        const scores = participants.map(p => ({ id: p.id, name: p.name, points: 0 }));

        const finishedMatches = matches.filter(m => m.status === 'FINISHED');

        finishedMatches.forEach(match => {
            const matchBets = bets.filter(b => b.matchId === match.id);
            
            let actualOutcome;
            if (match.actualHomeScore > match.actualAwayScore) actualOutcome = '1';
            else if (match.actualHomeScore < match.actualAwayScore) actualOutcome = '2';
            else actualOutcome = 'X';

            matchBets.forEach(bet => {
                const participant = scores.find(s => s.id === bet.participantId);
                if (!participant) return;

                if (bet.homeScoreBet === match.actualHomeScore && bet.awayScoreBet === match.actualAwayScore) {
                    participant.points += 3;
                } else {
                    let betOutcome;
                    if (bet.homeScoreBet > bet.awayScoreBet) betOutcome = '1';
                    else if (bet.homeScoreBet < bet.awayScoreBet) betOutcome = '2';
                    else betOutcome = 'X';

                    if (betOutcome === actualOutcome) {
                        participant.points += 1;
                    }
                }
            });
        });
        
        return scores.sort((a, b) => b.points - a.points);
    }, [participants, matches, bets]);

    if (loading) {
        return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Laddar tipsdata...</div>
    }
    
    if (error) {
        return <div className="bg-gray-900 text-red-400 min-h-screen flex items-center justify-center p-8 text-center">{error}</div>
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <Header />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="lg:col-span-1 space-y-8">
                        <Leaderboard data={leaderboardData} />
                    </div>
                    <div className="lg:col-span-2">
                        <MatchList matches={matches} bets={bets} participants={participants} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Underkomponenter ---

function Header() {
    return (
        <header className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 tracking-tight flex items-center justify-center gap-4">
                <FootballIcon />
                <span>EM-tips Damer 2025</span>
            </h1>
            <p className="text-gray-400 mt-2">Topplista och matcher</p>
        </header>
    );
}

function Leaderboard({ data }) {
    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <TrophyIcon />
                Topplista
            </h2>
            <ul className="space-y-3">
                {data.map((p, index) => (
                    <li key={p.id} className={`flex justify-between items-center p-3 rounded-lg ${index === 0 ? 'bg-yellow-500/20' : 'bg-gray-700/50'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg w-8 text-center ${index < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>{index + 1}</span>
                            <span className="font-medium">{p.name}</span>
                        </div>
                        <span className="font-bold text-xl text-cyan-400">{p.points} p</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AdminInfo() {
    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Hur uppdaterar jag resultat?</h2>
            <p className="text-gray-300">
                Resultat uppdateras genom att ändra i filen <code className="bg-gray-900 text-cyan-400 px-1 py-0.5 rounded">public/data/results.json</code>.
            </p>
            <p className="text-gray-300 mt-2">
                Efter att du har publicerat om sidan via GitHub/Vercel kommer topplistan att uppdateras.
            </p>
        </div>
    );
}


function MatchList({ matches, bets, participants }) {
    const [expandedMatchId, setExpandedMatchId] = useState(null);
    const [visibleCount, setVisibleCount] = useState(5);

    const toggleExpand = (matchId) => {
        setExpandedMatchId(prev => (prev === matchId ? null : matchId));
    };
    
    const getPointsForBet = (bet, match) => {
        if(match.status !== 'FINISHED') return null;
        
        let actualOutcome;
        if (match.actualHomeScore > match.actualAwayScore) actualOutcome = '1';
        else if (match.actualHomeScore < match.actualAwayScore) actualOutcome = '2';
        else actualOutcome = 'X';
        
        if (bet.homeScoreBet === match.actualHomeScore && bet.awayScoreBet === match.actualAwayScore) {
            return 3;
        }
        
        let betOutcome;
        if (bet.homeScoreBet > bet.awayScoreBet) betOutcome = '1';
        else if (bet.homeScoreBet < bet.awayScoreBet) betOutcome = '2';
        else betOutcome = 'X';

        if (betOutcome === actualOutcome) {
            return 1;
        }
        
        return 0;
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Alla Matcher</h2>
            <div className="space-y-2">
                {matches.slice(0, visibleCount).map(match => (
                    <div key={match.id} className="bg-gray-700/50 rounded-lg overflow-hidden">
                        <button onClick={() => toggleExpand(match.id)} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-700 transition-colors">
                            <div className="flex-1 min-w-0 mr-4">
                                <p className="text-xs text-gray-400">{match.group}</p>
                                <p className="font-bold text-lg whitespace-nowrap overflow-hidden text-ellipsis">{match.homeTeam} - {match.awayTeam}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {match.status === 'FINISHED' ? (
                                    <p className="text-xl font-bold text-cyan-400">{match.actualHomeScore} - {match.actualAwayScore}</p>
                                ) : (
                                    <p className="text-sm font-semibold text-gray-400 text-right">
                                        {new Date(match.matchDate).toLocaleString('sv-SE', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                                <ChevronDown className={`transform transition-transform ${expandedMatchId === match.id ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        {expandedMatchId === match.id && (
                            <div className="p-4 border-t border-gray-700">
                                <h4 className="font-semibold mb-2">Allas Tips:</h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                    {bets
                                        .filter(b => b.matchId === match.id)
                                        .sort((a, b) => {
                                            const pointsA = getPointsForBet(a, match);
                                            const pointsB = getPointsForBet(b, match);
                                            if (pointsA === null || pointsB === null) return 0;
                                            return pointsB - pointsA;
                                        })
                                        .map(bet => {
                                            const participant = participants.find(p => p.id === bet.participantId);
                                            const points = getPointsForBet(bet, match);
                                            return (
                                                <li key={bet.id} className="bg-gray-800/70 p-2 rounded-md flex justify-between">
                                                    <span>{participant ? participant.name : 'Okänd'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono">{bet.homeScoreBet}-{bet.awayScoreBet}</span>
                                                        {points !== null && (
                                                            <span className={`font-bold w-6 text-center rounded-full text-xs py-0.5 ${points === 3 ? 'bg-green-500' : points === 1 ? 'bg-yellow-500' : 'bg-red-500/50'}`}>
                                                                {points}p
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })
                                    }
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {visibleCount < matches.length && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setVisibleCount(prevCount => prevCount + 5)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                        Ladda fler matcher
                    </button>
                </div>
            )}
        </div>
    );
}
