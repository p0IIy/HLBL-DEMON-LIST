import { round, score } from './score.js';

const dir = './data';

export async function fetchList() {
    try {
        const response = await fetch(`${dir}/hlbl-list.json`);
        if (!response.ok) throw new Error('Could not load HLBL list data.');
        const levels = await response.json();
        return levels.map((level, rank) => [{
            ...level,
            path: `hlbl-${rank + 1}`,
            author: level.author || '',
            creators: level.creators || [],
            verifier: level.verifier || '',
            records: Array.isArray(level.records) ? level.records.sort((a, b) => b.percent - a.percent) : [],
        }, null]);
    } catch (error) {
        console.error('Failed to load list.', error);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const response = await fetch(`${dir}/_editors.json`);
        if (!response.ok) throw new Error('Could not load editors.');
        return await response.json();
    } catch { return null; }
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    if (!list) return [[], ['HLBL list data']];
    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err || !level) { errs.push(err || `Level #${rank + 1}`); return; }
        if (level.verifier) {
            const verifier = Object.keys(scoreMap).find(u => u.toLowerCase() === level.verifier.toLowerCase()) || level.verifier;
            scoreMap[verifier] ??= { verified: [], completed: [], progressed: [] };
            scoreMap[verifier].verified.push({ rank: rank + 1, level: level.name, score: score(rank + 1, 100, level.percentToQualify ?? 100), link: level.verification || '' });
        }
        level.records.forEach(record => {
            if (!record.user || typeof record.percent !== 'number') return;
            const user = Object.keys(scoreMap).find(u => u.toLowerCase() === record.user.toLowerCase()) || record.user;
            scoreMap[user] ??= { verified: [], completed: [], progressed: [] };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({ rank: rank + 1, level: level.name, score: score(rank + 1, 100, level.percentToQualify ?? 100), link: record.link || '' });
            } else if (level.percentToQualify != null) {
                progressed.push({ rank: rank + 1, level: level.name, percent: record.percent, score: score(rank + 1, record.percent, level.percentToQualify), link: record.link || '' });
            }
        });
    });
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed].flat().reduce((prev, cur) => prev + cur.score, 0);
        return { user, total: round(total), ...scores };
    });
    return [res.sort((a, b) => b.total - a.total), errs];
}
