document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordField = document.getElementById('inputPassword4');
    const icon = this.querySelector('i');
    if (passwordField.type === 'password') {
        passwordField.type = 'text'; // Show password
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    } else {
        passwordField.type = 'password'; // Hide password
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    }
});