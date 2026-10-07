// Wrap everything to ensure HTML loads first and variables don't conflict
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. SUPABASE INITIALIZATION
    // ==========================================
    const mySupabaseUrl = "https://ifkvaidmtvuacxxidnuq.supabase.co";
    const mySupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma3ZhaWRtdHZ1YWN4eGlkbnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTMzNTAsImV4cCI6MjEwNjg4OTM1MH0.n256LhZx_-XbyxV_HU7YnhWQ7IBrPCG1o_8D4iavo-A";
    const dbClient = window.supabase.createClient(mySupabaseUrl, mySupabaseKey);

    // ==========================================
    // 2. MOBILE MENU TOGGLE
    // ==========================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            if(navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '80px';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = '#ffffff';
                navLinks.style.padding = '20px 0';
                navLinks.style.boxShadow = '0 5px 10px rgba(0,0,0,0.1)';
            }
        });
    }

    // ==========================================
    // 3. CONTACT FORM -> SUPABASE DATABASE
    // ==========================================
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(event) {
            // THIS line is what stops the page from refreshing
            event.preventDefault(); 

            const statusDisplay = document.getElementById('form-status');
            const submitBtn = this.querySelector('button[type="submit"]');
            
            statusDisplay.style.display = 'block';
            statusDisplay.style.color = '#0088cc';
            statusDisplay.innerText = 'Connecting to database...';
            submitBtn.disabled = true;

            // Gather form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                company: document.getElementById('company').value,
                message: document.getElementById('message').value
            };

            // Insert directly into Supabase table
            const { error } = await dbClient.from('contact_queries').insert([formData]);

            if (error) {
                statusDisplay.style.color = 'red';
                statusDisplay.innerText = 'Database Error: ' + error.message;
                console.error('Supabase Error:', error);
            } else {
                statusDisplay.style.color = 'green';
                statusDisplay.innerText = 'Success! Your message was saved to Supabase.';
                contactForm.reset(); 
            }
            
            submitBtn.disabled = false;
        });
    }

    // ==========================================
    // 4. BLOG FETCH, EXPAND & COLLAPSE LOGIC
    // ==========================================
    let articles = []; 
    let currentIndex = 0;
    const articlesPerPage = 5;
    const grid = document.getElementById('article-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const collapseBtn = document.getElementById('collapse-btn');

    async function fetchArticlesFromDB() {
        if (!grid) return; 

        try {
            const { data, error } = await dbClient
                .from('articles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            articles = data || [];
            loadMoreArticles();
        } catch (error) {
            console.error('Error loading articles from DB:', error);
            grid.innerHTML = '<p style="text-align:center;">Failed to load tech news. Please try again later.</p>';
        }
    }

    function loadMoreArticles() {
        if (articles.length === 0) return; 

        const nextArticles = articles.slice(currentIndex, currentIndex + articlesPerPage);
        
        nextArticles.forEach(article => {
            const div = document.createElement('div');
            // Horizontal layout: row direction, fixed min-height
            div.style.cssText = "background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); display: flex; flex-direction: row; margin-bottom: 25px; min-height: 180px;";
            
            const fullText = article.desc || '';
            
            div.innerHTML = `
                <!-- Left Side: Fixed Image Rectangle -->
                <div style="flex: 0 0 250px; overflow: hidden; background: #f8f9fa;">
                    <img src="${article.image}" alt="${article.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                
                <!-- Right Side: Text & Button -->
                <div style="padding: 25px; display: flex; flex-direction: column; flex-grow: 1; justify-content: flex-start;">
                    <h3 style="color: var(--primary-color); margin-bottom: 12px; font-size: 1.5rem;">${article.title}</h3>
                    
                    <!-- 1st Line Preview -->
                    <p class="preview-text" style="color: var(--text-light); margin-bottom: 15px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.6;">
                        ${fullText}
                    </p>
                    
                    <!-- Full Text -->
                    <p class="full-text" style="display: none; color: var(--text-light); margin-bottom: 15px; white-space: pre-wrap; line-height: 1.6;">
                        ${fullText}
                    </p>
                    
                    <!-- Mini Arrow Button -->
                    <button class="extend-btn" style="background: var(--bg-light); border: none; color: var(--secondary-color); font-size: 1.2rem; cursor: pointer; align-self: flex-start; margin-top: auto; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s;" title="Read More">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            `;
            
            // Toggle Logic for the Mini Arrow
            const extendBtn = div.querySelector('.extend-btn');
            const previewText = div.querySelector('.preview-text');
            const fullTextEl = div.querySelector('.full-text');
            const icon = extendBtn.querySelector('i');
            
            extendBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (fullTextEl.style.display === 'none') {
                    fullTextEl.style.display = 'block';
                    previewText.style.display = 'none';
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                    this.style.background = 'var(--secondary-color)';
                    this.style.color = 'white';
                } else {
                    fullTextEl.style.display = 'none';
                    previewText.style.display = '-webkit-box'; 
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                    this.style.background = 'var(--bg-light)';
                    this.style.color = 'var(--secondary-color)';
                }
            });

            grid.appendChild(div);
        });
        currentIndex += articlesPerPage;

        if (collapseBtn) {
            collapseBtn.style.display = (currentIndex > articlesPerPage) ? 'block' : 'none';
        }

        if (currentIndex >= articles.length && loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreArticles);
    }
    
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            grid.innerHTML = ''; 
            currentIndex = 0; 
            loadMoreArticles();
            if (loadMoreBtn) loadMoreBtn.style.display = 'block';
            document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });
        });
    }

    fetchArticlesFromDB();

    // ==========================================
    // 5. APPS FETCH & RENDER LOGIC
    // ==========================================
    async function fetchAppsFromDB() {
        // Find which grids exist on the current page
        const latestGrid = document.getElementById('latest-apps-grid');
        const winGrid = document.getElementById('windows-apps-grid');
        const andGrid = document.getElementById('android-apps-grid');

        // If none of these elements exist on this page, stop running
        if (!latestGrid && !winGrid && !andGrid) return;

        try {
            const { data, error } = await dbClient
                .from('published_apps')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const apps = data || [];

            // 1. Render Latest Apps on Home Page (Mix of top 3)
            if (latestGrid) {
                const recentApps = apps.slice(0, 3);
                if (recentApps.length > 0) {
                    latestGrid.innerHTML = recentApps.map(createAppCard).join('');
                } else {
                    latestGrid.innerHTML = '<p>No applications published yet.</p>';
                }
            }

            // 2. Render Windows Apps on Apps Page
            if (winGrid) {
                const winApps = apps.filter(a => a.platform.toLowerCase() === 'windows');
                winGrid.innerHTML = winApps.length > 0 
                    ? winApps.map(createAppCard).join('') 
                    : '<p style="color: var(--text-light);">No Windows apps published yet.</p>';
            }
            
            // 3. Render Android Apps on Apps Page
            if (andGrid) {
                const andApps = apps.filter(a => a.platform.toLowerCase() === 'android');
                andGrid.innerHTML = andApps.length > 0 
                    ? andApps.map(createAppCard).join('') 
                    : '<p style="color: var(--text-light);">No Android apps published yet.</p>';
            }

        } catch (err) {
            console.error("Error fetching apps from DB:", err);
            if (latestGrid) latestGrid.innerHTML = '<p>Failed to load applications.</p>';
        }
    }

    // Helper function to build the HTML for a single app card
    function createAppCard(app) {
        // Determine the icon dynamically based on the database 'platform' column
        const isWindows = app.platform.toLowerCase() === 'windows';
        const platformIcon = isWindows 
            ? '<i class="fab fa-windows" style="color: #0078D6; margin-left: 8px;" title="Windows"></i>'
            : '<i class="fab fa-android" style="color: #3DDC84; margin-left: 8px;" title="Android"></i>';
            
        // Fallback logo if you don't provide an icon URL in the database
        const logoImg = app.icon_url || 'sasamirrorlogo.png';

        return `
            <a href="${app.download_url}" target="_blank" style="text-decoration: none; color: inherit; width: 280px;">
                <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); text-align: center; transition: transform 0.3s ease; height: 100%; display: flex; flex-direction: column;" 
                     onmouseover="this.style.transform='translateY(-5px)'" 
                     onmouseout="this.style.transform='translateY(0)'">
                    
                    <div style="margin-bottom: 15px;">
                        <img src="${logoImg}" alt="${app.app_name} Logo" style="width: 60px; height: 60px; object-fit: contain;">
                    </div>
                    
                    <h3 style="margin-bottom: 10px; color: var(--primary-color); font-size: 1.3rem; display: flex; align-items: center; justify-content: center;">
                        ${app.app_name} ${platformIcon}
                    </h3>
                    
                    <p style="font-size: 0.95rem; color: var(--text-light); margin-bottom: 20px; flex-grow: 1;">
                        ${app.short_desc}
                    </p>
                    
                    <div style="margin-top: auto;">
                        <span class="btn-primary" style="display: inline-block; padding: 10px 20px; width: 100%;">
                            Download Now
                        </span>
                    </div>
                </div>
            </a>
        `;
    }
    
    // Call the function when the page loads
    fetchAppsFromDB();
});