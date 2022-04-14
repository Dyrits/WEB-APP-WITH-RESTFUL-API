// Container for the front-end application:
const app = {};

// Configuration:
app.configuration = { token: false };

// AJAX Client:
app.client = {};

app.form = {};




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

// Init (bootstrapping)
app.init = function(){ app.form.bind(); };

// Call the init processes after the window loads
window.onload = function(){ app.init(); };
