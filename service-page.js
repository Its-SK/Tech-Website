// 1. Get the Service ID from the URL (e.g., "?id=cybersecurity")
const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get('id');

const contentContainer = document.getElementById('dynamic-service-content');

// 2. Fetch the JSON data
if (serviceId) {
    fetch('services.json')
        .then(response => response.json())
        .then(data => {
            // Find the specific service data using the ID
            const serviceData = data[serviceId];

            if (serviceData) {
                // 3. Inject the specific data into the HTML template
                contentContainer.innerHTML = `
                    <header class="hero" style="height: 40vh; background: linear-gradient(rgba(11, 61, 145, 0.9), rgba(11, 61, 145, 0.9)), url('${serviceData.image}') center/cover;">
                        <div class="container hero-content" style="padding-top: 50px;">
                            <i class="${serviceData.icon}" style="font-size: 4rem; color: var(--secondary-color); margin-bottom: 20px;"></i>
                            <h1 style="font-size: 3rem; margin-bottom: 10px;">${serviceData.title}</h1>
                            <p style="font-size: 1.2rem; color: #ddd;">${serviceData.tagline}</p>
                        </div>
                    </header>
                    
                    <section class="section-padding">
                        <div class="container" style="max-width: 800px; background: var(--white); padding: 50px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-top: -60px; position: relative;">
                            <div class="full-content" style="display: block; border-top: none; padding-top: 0; font-size: 1.1rem; line-height: 1.8;">
                                ${serviceData.content}
                            </div>
                            <div style="text-align: center; margin-top: 40px;">
                                <a href="index.html#contact" class="btn-primary" style="font-size: 1.2rem; padding: 15px 30px;">Request This Service</a>
                            </div>
                        </div>
                    </section>
                `;
            } else {
                // Fallback if they type a bad URL
                contentContainer.innerHTML = `<div class="container section-padding" style="text-align: center;"><h2>Service not found.</h2><a href="index.html">Return Home</a></div>`;
            }
        })
        .catch(error => console.error('Error loading service:', error));
} else {
    // Fallback if there is no ID in the URL
    contentContainer.innerHTML = `<div class="container section-padding" style="text-align: center;"><h2>No service selected.</h2><a href="index.html">Return Home</a></div>`;
}