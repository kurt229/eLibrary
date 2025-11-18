const SUPABASE_URL = "https://znplbmggiwkrwhasvnnt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGxibWdnaXdrcndoYXN2bm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY5OTcsImV4cCI6MjA3ODQ4Mjk5N30.Ee57N1miQbMO9hF_m1arrccv-6TbdHBL33Zy2YEL1q8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const btnSignup = document.querySelector('.btn-signup');
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.getElementById('strengthText');

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = '⚠️ ' + message;
        errorMessage.classList.add('show');
        if (successMessage) successMessage.classList.remove('show');
        setTimeout(() => errorMessage.classList.remove('show'), 5000);
    }
}

function showSuccess(message) {
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

function checkPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (password.length < 6) {
        return { strength: 0, text: 'Trop court', class: 'weak' };
    } else if (strength <= 2) {
        return { strength: 33, text: 'Faible', class: 'weak' };
    } else if (strength <= 4) {
        return { strength: 66, text: 'Moyen', class: 'medium' };
    } else {
        return { strength: 100, text: 'Fort', class: 'strong' };
    }
}

async function checkEmailExists(email) {
    try {
        const { data, error } = await supabaseClient.rpc('is_email_taken', {
            email_input: email
        });

        if (error) {
            console.error('Erreur RPC détaillée:', error);
            console.error('Message:', error.message);
            console.error('Code:', error.code);
            console.error('Details:', error.details);
            return null;
        }

        console.log('Résultat is_email_taken:', data);
        return data;
    } catch (error) {
        console.error('Erreur inattendue lors de la vérification:', error);
        return null;
    }
}

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;

        if (password.length === 0) {
            strengthMeter.style.display = 'none';
            return;
        }

        strengthMeter.style.display = 'flex';
        const result = checkPasswordStrength(password);

        const bar = strengthMeter.querySelector('.strength-bar-fill');
        bar.style.width = result.strength + '%';
        bar.className = 'strength-bar-fill ' + result.class;
        strengthText.textContent = result.text;
    });
}

if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (errorMessage) errorMessage.classList.remove('show');
        if (successMessage) successMessage.classList.remove('show');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!name || name.length < 2) {
            showError('Le nom doit contenir au moins 2 caractères');
            nameInput.focus();
            return;
        }

        if (!email || !isValidEmail(email)) {
            showError('Veuillez entrer une adresse email valide');
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showError('Les mots de passe ne correspondent pas');
            confirmPasswordInput.focus();
            return;
        }

        const strength = checkPasswordStrength(password);
        if (strength.strength < 33) {
            showError('Veuillez choisir un mot de passe plus fort');
            passwordInput.focus();
            return;
        }

        setLoading(btnSignup, true);

        try {
            // Vérifier si l'email existe déjà
            const emailExists = await checkEmailExists(email);
            
            if (emailExists === null) {
                throw new Error('Impossible de vérifier la disponibilité de l\'email');
            }
            
            if (emailExists === true) {
                showError('Un compte existe déjà avec cet email');
                emailInput.focus();
                setLoading(btnSignup, false);
                return;
            }

            // Procéder à l'inscription
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        display_name: name.split(' ')[0]
                    }
                }
            });

            if (error) throw error;

            console.log('Inscription réussie:', data);

            // Déconnecter l'utilisateur immédiatement après l'inscription
            await supabaseClient.auth.signOut();

            showSuccess('Compte créé avec succès ! Veuillez vous connecter.');

            // Redirection vers la page de connexion après 1.5 secondes
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            console.error('Erreur inscription:', error);

            let errorMsg = 'Une erreur est survenue. Veuillez réessayer.';

            if (error.message.includes('User already registered')) {
                errorMsg = 'Un compte existe déjà avec cet email';
            } else if (error.message.includes('Password should be')) {
                errorMsg = 'Le mot de passe ne respecte pas les critères de sécurité';
            } else if (error.message.includes('Invalid email')) {
                errorMsg = 'Adresse email invalide';
            } else if (error.message.includes('rate limit')) {
                errorMsg = 'Trop de tentatives. Veuillez réessayer plus tard';
            } else if (error.message.includes('disponibilité')) {
                errorMsg = error.message;
            }

            showError(errorMsg);

        } finally {
            setLoading(btnSignup, false);
        }
    });
}

(async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session && session.user) {
            console.log('Session existante détectée');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.warn('Vérification session:', error);
    }
})();

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

if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const confirm = confirmPasswordInput.value;

        if (confirm.length > 0) {
            if (password === confirm) {
                confirmPasswordInput.style.borderColor = '#228B22';
            } else {
                confirmPasswordInput.style.borderColor = '#ef4444';
            }
        } else {
            confirmPasswordInput.style.borderColor = '';
        }
    });
}

console.log('%c🚀 HECM E-Library - Signup System', 'color: #228B22; font-size: 16px; font-weight: bold;');
console.log('%cSupabase initialized', 'color: #32CD32;');