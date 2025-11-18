const SUPABASE_URL = "https://znplbmggiwkrwhasvnnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGxibWdnaXdrcndoYXN2bm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY5OTcsImV4cCI6MjA3ODQ4Mjk5N30.Ee57N1miQbMO9hF_m1arrccv-6TbdHBL33Zy2YEL1q8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const btnLogin = document.querySelector('.btn-login');
const googleBtn = document.getElementById('googleBtn');

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = '⚠️ ' + message;
        errorMessage.classList.add('show');
        if (successMessage) successMessage.classList.remove('show');
        setTimeout(() => errorMessage.classList.remove('show'), 5000);
    }
}

function showSuccess(message = "Connexion réussie ! Redirection...") {
    if (successMessage) {
        successMessage.textContent = '✅ ' + message;
        successMessage.classList.add('show');
        if (errorMessage) errorMessage.classList.remove('show');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Fonction pour vérifier le statut d'approbation de l'utilisateur
async function checkUserApprovalStatus(email) {
    try {
        const { data, error } = await supabaseClient.rpc('check_user_approval_status', {
            user_email: email
        });

        if (error) {
            console.error('Erreur RPC check_user_approval_status:', error);
            return null;
        }

        console.log('Statut d\'approbation pour', email, ':', data);
        return data; // true = approuvé, false = en attente
    } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
        return null;
    }
}

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (errorMessage) errorMessage.classList.remove('show');
        if (successMessage) successMessage.classList.remove('show');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Veuillez remplir tous les champs');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            passwordInput.focus();
            return;
        }

        setLoading(btnLogin, true);

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            console.log('Utilisateur connecté:', data.user);

            // Vérifier si c'est un admin
            const isAdmin = data.user.user_metadata?.is_admin === true;
            console.log('Est admin:', isAdmin);

            if (isAdmin) {
                // Admin : redirection directe vers le dashboard admin
                showSuccess('Connexion admin réussie !');
                
                if (data.session) {
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('isAdmin', 'true');
                }

                setTimeout(() => {
                    window.location.href = 'admin/index.html';
                }, 1200);
                return;
            }

            // Pour les utilisateurs non-admin, vérifier le statut d'approbation
            const isApproved = await checkUserApprovalStatus(email);

            if (isApproved === null) {
                // Erreur lors de la vérification, on laisse passer (comportement par défaut)
                console.warn('Impossible de vérifier le statut d\'approbation');
                showSuccess();
                
                if (data.session) {
                    localStorage.setItem('userEmail', data.user.email);
                }

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);
            } else if (isApproved === false) {
                // Compte en attente d'approbation - L'UTILISATEUR RESTE CONNECTÉ
                showSuccess('Connexion réussie ! Vérification du statut...');
                
                if (data.session) {
                    localStorage.setItem('userEmail', data.user.email);
                }

                // NE PAS déconnecter l'utilisateur
                setTimeout(() => {
                    window.location.href = `waiting_approval.html?email=${encodeURIComponent(email)}`;
                }, 1500);
            } else {
                // Compte approuvé, accès au dashboard
                showSuccess();

                if (data.session) {
                    localStorage.setItem('userEmail', data.user.email);
                }

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);
            }

        } catch (error) {
            console.error('Erreur de connexion:', error);

            let errorMsg = 'Une erreur est survenue. Veuillez réessayer.';

            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Email ou mot de passe incorrect';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Veuillez confirmer votre email';
                showError(errorMsg);
                setTimeout(() => {
                    window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
                }, 2000);
                return;
            } else if (error.message.includes('User not found')) {
                errorMsg = 'Aucun compte trouvé avec cet email';
            } else if (error.message.includes('Too many requests')) {
                errorMsg = 'Trop de tentatives. Veuillez réessayer dans quelques minutes';
            }

            showError(errorMsg);

        } finally {
            setLoading(btnLogin, false);
        }
    });
}

if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const originalHTML = googleBtn.innerHTML;

        try {
            googleBtn.classList.add('btn-loading');
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<span>Redirection vers Google...</span>';

            const redirectTo = window.location.origin + 'dashboard.html';

            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) throw error;

            console.log('OAuth initié:', data);

        } catch (error) {
            console.error('Erreur OAuth Google:', error);

            let errorMsg = 'Erreur lors de la connexion avec Google';

            if (error.message.includes('popup')) {
                errorMsg = 'Veuillez autoriser les popups pour vous connecter avec Google';
            }

            showError(errorMsg);

            googleBtn.disabled = false;
            googleBtn.classList.remove('btn-loading');
            googleBtn.innerHTML = originalHTML;
        }
    });
}

(async () => {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.warn('Erreur lors de la vérification de session:', error);
            return;
        }

        if (session && session.user) {
            console.log('Session active détectée:', session.user.email);
            
            // Vérifier si c'est un admin
            const isAdmin = session.user.user_metadata?.is_admin === true;
            
            if (isAdmin) {
                console.log('Admin détecté, redirection vers dashboard admin');
                localStorage.setItem('isAdmin', 'true');
                showSuccess('Session admin active, redirection...');
                setTimeout(() => {
                    window.location.href = 'admin/index.html';
                }, 1200);
                return;
            }
            
            // Pour les utilisateurs non-admin, vérifier le statut d'approbation
            const isApproved = await checkUserApprovalStatus(session.user.email);
            
            if (isApproved === false) {
                // Compte en attente, rediriger vers waiting_approval SANS déconnecter
                window.location.href = `waiting_approval.html?email=${encodeURIComponent(session.user.email)}`;
            } else {
                // Compte approuvé ou statut non disponible, rediriger vers dashboard
                showSuccess('Session active, redirection...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);
            }
        }

    } catch (error) {
        console.warn('Impossible de vérifier la session:', error);
    }
})();

window.addEventListener('load', async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
        console.log('OAuth callback détecté');
        showSuccess('Connexion Google réussie !');

        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();

            if (error) throw error;

            if (user) {
                console.log('Utilisateur OAuth:', user.email);
                
                // Vérifier si c'est un admin
                const isAdmin = user.user_metadata?.is_admin === true;
                
                if (isAdmin) {
                    console.log('Admin OAuth détecté');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('isAdmin', 'true');
                    setTimeout(() => {
                        window.location.href = 'admin/index.html';
                    }, 1200);
                    return;
                }
                
                // Pour les utilisateurs non-admin, vérifier le statut d'approbation
                const isApproved = await checkUserApprovalStatus(user.email);
                
                if (isApproved === false) {
                    // Compte en attente - L'utilisateur reste connecté
                    localStorage.setItem('userEmail', user.email);
                    setTimeout(() => {
                        window.location.href = `waiting_approval.html?email=${encodeURIComponent(user.email)}`;
                    }, 1200);
                } else {
                    // Compte approuvé
                    localStorage.setItem('userEmail', user.email);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1200);
                }
            }

        } catch (error) {
            console.error('Erreur OAuth callback:', error);
            showError('Erreur lors de la connexion Google');
        }
    }
});

const inputs = document.querySelectorAll('.form-control');

inputs.forEach(input => {
    input.addEventListener('focus', () => {
        if (input.parentElement.parentElement) {
            input.parentElement.parentElement.style.transform = 'scale(1.02)';
            input.parentElement.parentElement.style.transition = 'transform 0.2s ease';
        }
    });

    input.addEventListener('blur', () => {
        if (input.parentElement.parentElement) {
            input.parentElement.parentElement.style.transform = 'scale(1)';
        }
    });
});

console.log('%c🔐 HECM E-Library - Login System', 'color: #228B22; font-size: 16px; font-weight: bold;');
console.log('%cSupabase URL:', 'color: #32CD32; font-weight: bold;', SUPABASE_URL);