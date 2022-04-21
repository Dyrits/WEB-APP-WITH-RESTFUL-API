// Container for the front-end application:
const app = {};

// Configuration:
app.configuration = { token: false };

// AJAX Client:
app.client = {};

app.form = {};
app.token = {};


// Interface for making API calls:
app.client.request = async function (headers, path, method, query, payload) {
    headers = headers || {};
    app.configuration.token && (headers.token = app.configuration.token)
    path = path || "/";
    query = query || {};
    let url = `${path}?`;
    for (const [key, value] in Object.entries(query)) {
        url += `${key}=${value}&`;
    }
    const options = {
        method: method.toUpperCase(),
        headers: {...headers, "Content-Type": "application/json"},
        body: JSON.stringify(payload)
    };
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
}

app.form.bind = function() {
    document.querySelector("form").addEventListener("submit", async function ($event) {
        $event.preventDefault();
        const {id, action, method, elements} = this;
        const error = document.querySelector(`#${id} .formError`);
        // Hide the error message (if it's currently shown due to a previous error):
        error.style.display = 'hidden';
        // Turn the inputs into a payload:
        const payload = {};
        [...elements].forEach(element => {
            if (element.type !== 'submit') {
                payload[element.name] = element.type === 'checkbox' ? element.checked : element.value;
            }
        });
        const {status, data} = await app.client.request({}, action, method, {}, payload);
        if (status !== 200) {
            // Set the error field with the error text:
            error.innerHTML = typeof (data.Error) == 'string' ? data.Error : 'An error has occurred, please try again.';
            // Show  the form error field on the form:
            error.style.display = 'block';
        } else {
            // If successful, send to form response processor:
            app.form.processor(id, payload, data);
        }
    });
};

// Form response processor
app.form.processor = function(id, payload, data){
    const call = false;
    if(id === 'signup') {
        console.log("The form was successfully submitted.");
        // @TODO Do something here now that the account has been created successfully
    }
};

// Form response processor
app.form.processor = async function (id, payload, data) {
    // If account creation was successful, try to immediately log the user in:
    if (id === "signup") {
        // Take the phone and password, and use it to log the user in:
        const {phone, password} = payload;

        const {status, token} = await app.client.request({}, "api/tokens", "POST", {}, {phone, password});
        // Display an error on the form if needed:
        console.log(status, token);
        if (status !== 200) {
            const div = document.querySelector(`#${id} .formError`);
            // Set the formError field with the error text:
            div.innerHTML = "Sorry, an error has occurred. Please try again.";
            // Show (unhide) the form error field on the form:
            div.style.display = "block";
        } else {
            // If successful, set the token and redirect the user:
            app.token.set(token);
            window.location = "/checks/checklist";
        }
    }
    // If login was successful, set the token in localstorage and redirect the user:
    if (id === "signin") {
        app.token.set(data);
        window.location = "/checks/checklist";
    }
};

// Get the session token from localstorage and set it in the app.config object:
app.token.get = function (){
    const string = localStorage.getItem("token");
    try {
        app.configuration.token = JSON.parse(string);
        document.querySelector("body").classList.add("signedin");
    } catch (error) {
        app.configuration.token = false;
        document.querySelector("body").classList.remove("signedin");
    }
};

// Set the session token in the app.config object as well as localstorage:
app.token.set = function(token) {
    if (token) {
        app.configuration.token = token;
        localStorage.setItem("token", JSON.stringify(token));
        document.querySelector("body").classList.add("signedin");
    }
}

// Renew the token
app.token.renew = async function () {
    const token = app.configuration.token || false;
    if (token) {
        // Update the token with a new expiration:
        const {status, data} = await app.client.request({}, "api/tokens", "PUT", {}, {id: token.id, extend: true});
        // Display an error on the form if needed:
        if (status === 200) {
            // Get the new token details:
            const {status, data} = await app.client.request({}, 'api/tokens', 'GET', {id: token.id}, {});
            // Display an error on the form if needed
            app.token.set(status === 200 ? data : false);
            return true;
        }
    }
    return false;
};

// Loop to renew token often
app.token.interval = function(){
    setInterval(function(){
        app.token.renew() && console.log(`Token renewed at ${new Date()}`);
    },1000 * 60);
};

// Init (bootstrapping)
app.init = function(){
    document.querySelector("form") && app.form.bind();
    app.token.get();
    app.token.interval();
};

// Call the init processes after the window loads
window.onload = function(){ app.init(); };
