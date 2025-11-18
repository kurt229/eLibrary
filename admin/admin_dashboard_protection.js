// À ajouter au début du fichier /admin/index.html ou admin.js

const SUPABASE_URL = "https://znplbmggiwkrwhasvnnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGxibWdnaXdrcndoYXN2bm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY5OTcsImV4cCI6MjA3ODQ4Mjk5N30.Ee57N1miQbMO9hF_m1arrccv-6TbdHBL33Zy2YEL1q8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Protection du dashboard admin - À exécuter avant tout autre code
(async () => {
    try {
        // Vérifier si l'utilisateur est connecté
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error || !session || !session.user) {
            console.warn('Utilisateur non connecté, redirection vers login');
            window.location.href = 'login.html';
            return;
        }

        console.log('Session active pour:', session.user.email);

        // Vérifier si c'est un admin
        const isAdmin = session.user.user_metadata?.is_admin === true;
        
        if (!isAdmin) {
            console.warn('Non-admin détecté, redirection vers dashboard utilisateur ou login');
            
            // Vérifier si l'utilisateur est approuvé
            const { data: isApproved } = await supabaseClient.rpc('check_user_approval_status', {
                user_email: session.user.email
            });
            
            if (isApproved === false) {
                window.location.href = `/waiting_approval.html?email=${encodeURIComponent(session.user.email)}`;
            } else if (isApproved === true) {
                window.location.href = '../dashboard.html';
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        console.log('✅ Admin vérifié, accès au dashboard admin autorisé');
        
        // Sauvegarder le statut admin
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('userEmail', session.user.email);

    } catch (error) {
        console.error('Erreur lors de la protection du dashboard admin:', error);
        window.location.href = 'login.html';
    }
})();