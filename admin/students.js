
// students.js - Gestion de la page Étudiants

document.addEventListener('DOMContentLoaded', () => {
    initStudentsPage();
});

async function initStudentsPage() {
    console.log('🔄 Chargement de la page étudiants...');
    await fetchStudents();
    console.log('✅ Page étudiants chargée');
}

// --- Students Management (RPC) ---
async function fetchStudents() {
    try {
        const { data: users, error } = await supabaseClient.rpc('get_all_users');

        if (error) throw error;

        // Render Table
        renderStudentsTable(users);

    } catch (err) {
        console.error('Erreur Fetch Students:', err);
        // Show error state in table
        const tbody = document.querySelector('table tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4444">Erreur de chargement: ${err.message}</td></tr>`;
    }
}

function renderStudentsTable(users) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    users.forEach(user => {
        if (user.is_admin) return; // Hide admins from this list usually

        const date = new Date(user.created_at).toLocaleDateString('fr-FR');
        const avatarLetter = user.email.charAt(0).toUpperCase();
        const statusBadge = user.is_ok
            ? '<span class="status-badge status-success">Validé</span>'
            : '<span class="status-badge status-pending">En attente</span>';

        const actions = user.is_ok
            ? `<button class="action-btn" onclick="deleteUser('${user.id}')" title="Supprimer"><i class="ph ph-trash" style="color: #ff4444;"></i></button>`
            : `<button class="action-btn" onclick="approveUser('${user.id}')" title="Approuver"><i class="ph ph-check" style="color: var(--accent-green);"></i></button>
               <button class="action-btn" onclick="deleteUser('${user.id}')" title="Refuser/Supprimer"><i class="ph ph-x" style="color: #ff4444;"></i></button>`;

        const row = `
            <tr>
                <td>
                    <div class="flex-center" style="justify-content: flex-start; gap: 0.8rem;">
                        <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.8rem;">${avatarLetter}</div>
                        <span>${user.full_name || 'Utilisateur'}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${date}</td>
                <td>${statusBadge}</td>
                <td>${actions}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

async function approveUser(userId) {
    if (!confirm('Voulez-vous vraiment approuver cet utilisateur ?')) return;

    try {
        const { data, error } = await supabaseClient.rpc('approve_user', { target_user_id: userId });
        if (error) throw error;

        // Refresh list
        fetchStudents();
        alert('Utilisateur approuvé !');
    } catch (err) {
        console.error('Erreur Approval:', err);
        alert('Erreur: ' + err.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.')) return;

    try {
        const { data, error } = await supabaseClient.rpc('delete_user', { target_user_id: userId });
        if (error) throw error;

        // Refresh list
        fetchStudents();
        alert('Utilisateur supprimé !');
    } catch (err) {
        console.error('Erreur Deletion:', err);
        alert('Erreur: ' + err.message);
    }
}
