
// admin_data.js - Gestion des données du dashboard

document.addEventListener('DOMContentLoaded', () => {
    initDashboardData();
});

async function initDashboardData() {
    console.log('🔄 Chargement des données du dashboard...');

    await Promise.all([
        fetchKPIs(),
        fetchDownloadsChart(),
        fetchDocumentTypesChart(),
        fetchRecentActivity(),
        fetchStudentStats()
    ]);

    console.log('✅ Données du dashboard chargées');
}

// --- KPI Cards ---
async function fetchKPIs() {
    try {
        // 1. Documents Count
        const { count: docsCount, error: docsError } = await supabaseClient
            .from('documents')
            .select('*', { count: 'exact', head: true });

        if (!docsError) {
            updateStat('stat-documents', docsCount);
        }

        // 2. Downloads Count
        const { count: dlCount, error: dlError } = await supabaseClient
            .from('downloads')
            .select('*', { count: 'exact', head: true });

        if (!dlError) {
            updateStat('stat-downloads', dlCount);
        }

    } catch (err) {
        console.error('Erreur KPI:', err);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) {
        // Animation simple
        el.textContent = value;
        el.parentElement.classList.add('fade-in'); // Add a class if you want animation
    }
}

// --- Students Stats (RPC) ---
async function fetchStudentStats() {
    try {
        const { data: users, error } = await supabaseClient.rpc('get_all_users');

        if (error) throw error;

        // Update KPIs only
        const totalStudents = users.length;
        const pendingStudents = users.filter(u => !u.is_ok && !u.is_admin).length;

        updateStat('stat-students', totalStudents);
        updateStat('stat-pending', pendingStudents);

    } catch (err) {
        console.error('Erreur Fetch Student Stats:', err);
    }
}

// --- Charts & Activity (Kept for Dashboard) ---

async function fetchDownloadsChart() {
    try {
        const { data, error } = await supabaseClient
            .from('downloads')
            .select('downloaded_at')
            .gte('downloaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        // Process data
        const counts = {};
        // Initialize last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            counts[dateStr] = 0;
        }

        data.forEach(row => {
            const dateStr = row.downloaded_at.split('T')[0];
            if (counts[dateStr] !== undefined) counts[dateStr]++;
        });

        // Render Chart (using ApexCharts)
        const options = {
            series: [{
                name: 'Téléchargements',
                data: Object.values(counts).reverse()
            }],
            chart: {
                type: 'area',
                height: 300,
                toolbar: { show: false },
                background: 'transparent'
            },
            colors: ['#2962ff'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: {
                categories: Object.keys(counts).reverse().map(d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })),
                labels: { style: { colors: '#a1a1aa' } },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: { style: { colors: '#a1a1aa' } }
            },
            grid: {
                borderColor: 'rgba(255,255,255,0.05)',
                strokeDashArray: 4,
            },
            theme: { mode: 'dark' }
        };

        const chartEl = document.querySelector("#downloadsChart");
        if (chartEl) {
            chartEl.innerHTML = '';
            const chart = new ApexCharts(chartEl, options);
            chart.render();
        }

    } catch (err) {
        console.error('Erreur Chart Downloads:', err);
    }
}

async function fetchDocumentTypesChart() {
    try {
        const { data, error } = await supabaseClient
            .from('documents')
            .select('type');

        if (error) throw error;

        const typeCounts = {};
        data.forEach(doc => {
            const t = doc.type || 'Autre';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });

        const labels = Object.keys(typeCounts);
        const series = Object.values(typeCounts);

        const options = {
            series: series,
            labels: labels,
            chart: {
                type: 'donut',
                height: 300,
                background: 'transparent'
            },
            colors: ['#2962ff', '#00f2ea', '#7000ff', '#00e676'],
            stroke: { show: false },
            dataLabels: { enabled: false },
            legend: {
                position: 'bottom',
                labels: { colors: '#a1a1aa' }
            },
            theme: { mode: 'dark' }
        };

        const chartEl = document.querySelector("#typesChart");
        if (chartEl) {
            chartEl.innerHTML = '';
            const chart = new ApexCharts(chartEl, options);
            chart.render();
        }

    } catch (err) {
        console.error('Erreur Chart Types:', err);
    }
}

async function fetchRecentActivity() {
    try {
        const { data, error } = await supabaseClient
            .from('downloads')
            .select(`
                downloaded_at,
                documents (title, type)
            `)
            .order('downloaded_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const tbody = document.querySelector('#view-dashboard table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            data.forEach(item => {
                const date = new Date(item.downloaded_at).toLocaleDateString('fr-FR');
                const title = item.documents?.title || 'Document inconnu';
                const type = item.documents?.type || '-';

                const row = `
                    <tr>
                        <td>
                            <div class="flex-center" style="justify-content: flex-start; gap: 0.8rem;">
                                <div class="stat-icon" style="width: 30px; height: 30px; font-size: 0.8rem;"><i class="ph ph-user"></i></div>
                                <span>Utilisateur</span>
                            </div>
                        </td>
                        <td>${title} <span style="font-size:0.8em; color:var(--text-muted)">(${type})</span></td>
                        <td>${date}</td>
                        <td><span class="status-badge status-success">Téléchargé</span></td>
                        <td>
                            <button class="action-btn"><i class="ph ph-dots-three"></i></button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });
        }

    } catch (err) {
        console.error('Erreur Recent Activity:', err);
    }
}
