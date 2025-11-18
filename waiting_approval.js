const SUPABASE_URL = "https://znplbmggiwkrwhasvnnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGxibWdnaXdrcndoYXN2bm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY5OTcsImV4cCI6MjA3ODQ4Mjk5N30.Ee57N1miQbMO9hF_m1arrccv-6TbdHBL33Zy2YEL1q8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const waitingContainer = document.getElementById('waitingContainer');
const approvedContainer = document.getElementById('approvedContainer');
const emailDisplay = document.getElementById('emailDisplay');
const emailDisplayApproved = document.getElementById('emailDisplayApproved');
const checkStatusBtn = document.getElementById('checkStatusBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const goToLoginBtn = document.getElementById('goToLoginBtn');
const successMessage = document.getElementById('successMessage');

let userEmail = null;
let checkInterval = null;
let isAuthenticated = false;

function showSuccess(message) {
    if (successMessage) {
        successMessage.textContent = '✅ ' + message;
        successMessage.classList.add('show');
        setTimeout(() => successMessage.classList.remove('show'), 5000);
    }
}

function showError(message) {
    if (successMessage) {
        successMessage.textContent = '⚠️ ' + message;
        successMessage.classList.add('show');
        setTimeout(() => successMessage.classList.remove('show'), 5000);
    }
}

function displayEmail(email) {
    userEmail = email;
    if (emailDisplay) {
        emailDisplay.textContent = email || 'Email non disponible';
    }
    if (emailDisplayApproved) {
        emailDisplayApproved.textContent = email || 'Email non disponible';
    }
}

// Vérifier si l'utilisateur est authentifié
async function checkAuthentication() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Erreur lors de la vérification de session:', error);
            return null;
        }

        if (!session || !session.user) {
            console.warn('Aucune session active détectée');
            return null;
        }

        console.log('Session active pour:', session.user.email);
        return session.user;

    } catch (error) {
        console.error('Erreur lors de la vérification d\'authentification:', error);
        return null;
    }
}

async function checkApprovalStatus() {
    if (!userEmail) {
        console.error('Email non disponible');
        return null;
    }

    try {
        console.log('Vérification du statut pour:', userEmail);

        const { data, error } = await supabaseClient.rpc('check_user_approval_status', {
            user_email: userEmail
        });

        if (error) {
            console.error('Erreur RPC check_user_approval_status:', error);
            return null;
        }

        console.log('Statut reçu:', data);
        return data;

    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        return null;
    }
}

async function handleCheckStatus() {
    if (!checkStatusBtn) return;

    const originalText = checkStatusBtn.innerHTML;
    checkStatusBtn.disabled = true;
    checkStatusBtn.innerHTML = '<span class="loading-spinner"></span><span>Vérification...</span>';

    try {
        const status = await checkApprovalStatus();

        if (status === null) {
            showError('Impossible de vérifier le statut. Réessayez plus tard.');
        } else if (status === true) {
            showSuccess('Votre compte a été approuvé ! Redirection...');
            
            waitingContainer.style.display = 'none';
            approvedContainer.classList.add('show');
            
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        } else {
            showSuccess('Votre compte est toujours en attente d\'approbation.');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showError('Une erreur est survenue. Réessayez.');
    } finally {
        checkStatusBtn.disabled = false;
        checkStatusBtn.innerHTML = originalText;
    }
}

function startAutoCheck() {
    checkInterval = setInterval(async () => {
        console.log('Vérification automatique du statut...');
        
        // Vérifier d'abord si l'utilisateur est toujours connecté
        const user = await checkAuthentication();
        
        if (!user) {
            console.warn('Session expirée, redirection vers login');
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
            window.location.href = 'login.html';
            return;
        }

        const status = await checkApprovalStatus();

        if (status === true) {
            console.log('Compte approuvé détecté !');
            
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }

            waitingContainer.style.display = 'none';
            approvedContainer.classList.add('show');
        }
    }, 30000); // Vérification toutes les 30 secondes
}

if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', handleCheckStatus);
}

if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', async () => {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        // Déconnecter l'utilisateur avant de retourner au login
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
}

if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
}

// Initialisation au chargement de la page
(async () => {
    // ÉTAPE 1 : Vérifier d'abord l'authentification
    const user = await checkAuthentication();
    
    if (!user) {
        console.error('Utilisateur non authentifié');
        showError('Session expirée. Redirection vers la page de connexion...');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // ÉTAPE 2 : L'utilisateur est authentifié, utiliser son email
    const authenticatedEmail = user.email;
    isAuthenticated = true;
    
    console.log('Utilisateur authentifié:', authenticatedEmail);
    
    // Récupérer l'email depuis l'URL (pour affichage uniquement)
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromURL = urlParams.get('email');
    
    // Vérifier que l'email de l'URL correspond à l'utilisateur connecté
    if (emailFromURL && emailFromURL !== authenticatedEmail) {
        console.warn('Email de l\'URL ne correspond pas à l\'utilisateur connecté');
        showError('Erreur de correspondance d\'email. Redirection...');
        
        await supabaseClient.auth.signOut();
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // ÉTAPE 3 : Afficher l'email authentifié
    displayEmail(authenticatedEmail);

    // ÉTAPE 4 : Vérifier le statut d'approbation
    const initialStatus = await checkApprovalStatus();
    
    if (initialStatus === true) {
        console.log('Compte déjà approuvé');
        waitingContainer.style.display = 'none';
        approvedContainer.classList.add('show');
    } else if (initialStatus === false) {
        // Compte en attente, démarrer la vérification automatique
        console.log('Compte en attente d\'approbation');
        startAutoCheck();
    } else {
        // Erreur lors de la vérification
        console.error('Impossible de vérifier le statut d\'approbation');
        showError('Erreur lors de la vérification du statut');
    }
})();

// Nettoyer l'intervalle avant de quitter la page
window.addEventListener('beforeunload', () => {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
});

// Écouter les changements d'état d'authentification
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    
    if (event === 'SIGNED_OUT') {
        console.log('Utilisateur déconnecté');
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        window.location.href = 'login.html';
    }
    
    if (event === 'TOKEN_REFRESHED') {
        console.log('Token rafraîchi');
    }
});

console.log('%c⏳ HECM E-Library - Waiting Approval', 'color: #f59e0b; font-size: 16px; font-weight: bold;');
console.log('%cVérification automatique activée (sécurisée)', 'color: #fbbf24;');