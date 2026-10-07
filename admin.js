document.addEventListener('DOMContentLoaded', () => {
    console.log("Step 1: admin.js has successfully loaded.");

    // 1. SUPABASE INITIALIZATION
    if (typeof window.supabase === 'undefined') {
        console.error("CRITICAL ERROR: Supabase CDN did not load.");
        alert("Supabase failed to load. Please check your internet or adblocker.");
        return;
    }

    const mySupabaseUrl = "https://ifkvaidmtvuacxxidnuq.supabase.co";
    const mySupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma3ZhaWRtdHZ1YWN4eGlkbnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTMzNTAsImV4cCI6MjEwNjg4OTM1MH0.n256LhZx_-XbyxV_HU7YnhWQ7IBrPCG1o_8D4iavo-A";
    const dbClient = window.supabase.createClient(mySupabaseUrl, mySupabaseKey);
    console.log("Step 2: Supabase client connected.");

    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');

    async function checkSession() {
        console.log("Step 3: Checking for existing login session...");
        try {
            const { data: { session }, error } = await dbClient.auth.getSession();
            if (error) throw error;
            
            if (session) {
                console.log("Session found! Loading dashboard...");
                loginScreen.classList.remove('active');
                dashboardScreen.classList.add('active');
                loadQueries();
                loadArticles(); 
                loadApps();
            } else {
                console.log("No session found. Staying on login screen.");
            }
        } catch (err) {
            console.error("Session check failed:", err);
        }
    }
    checkSession();

    // 2. LOGIN FORM SUBMIT
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error("CRITICAL ERROR: Could not find <form id='login-form'> in admin.html");
    } else {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Step 4: Login button clicked! Attempting authentication...");
            
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const errorMsg = document.getElementById('login-error');
            const submitBtn = loginForm.querySelector('button');

            submitBtn.innerText = "Authenticating...";
            submitBtn.disabled = true;
            errorMsg.style.display = 'none';
            
            try {
                const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
                
                if (error) {
                    console.error("Login rejected by Supabase:", error);
                    errorMsg.innerText = error.message;
                    errorMsg.style.display = 'block';
                } else {
                    console.log("Login successful!", data);
                    checkSession();
                }
            } catch (err) {
                console.error("Network or script error during login:", err);
            }
            
            submitBtn.innerText = "Login Securely";
            submitBtn.disabled = false;
        });
    }

    // 3. TAB NAVIGATION
    const navButtons = document.querySelectorAll('.sidebar .nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
            if (btn.dataset.target === 'queries-tab') loadQueries();
            if (btn.dataset.target === 'articles-tab') loadArticles(); 
            if (btn.dataset.target === 'apps-tab') loadApps();
        });
    });

    // 4. LOAD CLIENT QUERIES
    async function loadQueries() {
        console.log("Loading client queries...");
        const tbody = document.getElementById('queries-tbody');
        tbody.innerHTML = '<tr><td colspan="4">Loading data from database...</td></tr>';

        const { data, error } = await dbClient.from('contact_queries').select('*').order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to load queries:", error);
            tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No client inquiries found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(q => {
            const dateStr = new Date(q.created_at).toLocaleDateString();
            return `<tr>
                <td>${dateStr}</td>
                <td><strong>${q.name}</strong><br><small>${q.company || 'N/A'}</small></td>
                <td><a href="mailto:${q.email}">${q.email}</a></td>
                <td>${q.message}</td>
            </tr>`;
        }).join('');
    }

    // 5. LOGOUT HANDLER
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log("Logging out...");
            await dbClient.auth.signOut();
            loginScreen.classList.add('active');
            dashboardScreen.classList.remove('active');
        });
    }

    // 6. PUBLISH NEW APP (FILE + ICON UPLOAD WITH PROGRESS BAR)
    const appForm = document.getElementById('app-form');
    if (appForm) {
        appForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('app-submit-btn');
            const status = document.getElementById('app-status');
            const fileInput = document.getElementById('app-file');
            const iconInput = document.getElementById('app-icon-file'); // The new icon input
            const progressContainer = document.getElementById('upload-progress-container');
            const progressBar = document.getElementById('upload-progress-bar');
            
            const appFile = fileInput.files[0];
            const iconFile = iconInput.files[0];
            
            if (appFile.size > 50 * 1024 * 1024) {
                status.style.color = 'red';
                status.innerText = 'Error: App file is larger than 50MB limit.';
                return;
            }
            
            btn.disabled = true;
            status.style.color = 'blue';
            
            try {
                let finalIconUrl = null;

                // Step A: Upload the Icon Image (if selected)
                if (iconFile) {
                    status.innerText = 'Uploading app icon...';
                    const safeIconName = `icon_${Date.now()}_${iconFile.name.replace(/\s+/g, '_')}`;
                    const { error: iconError } = await dbClient.storage.from('downloads').upload(safeIconName, iconFile);
                    if (iconError) throw iconError;
                    
                    const { data: iconData } = dbClient.storage.from('downloads').getPublicUrl(safeIconName);
                    finalIconUrl = iconData.publicUrl;
                }

                // Step B: Upload the Main App File (with progress bar)
                status.innerText = 'Initializing app upload...';
                progressContainer.style.display = 'block';
                progressBar.style.width = '0%';

                const safeFileName = `app_${Date.now()}_${appFile.name.replace(/\s+/g, '_')}`;
                
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', `${mySupabaseUrl}/storage/v1/object/downloads/${safeFileName}`);
                    xhr.setRequestHeader('Authorization', `Bearer ${mySupabaseKey}`);
                    xhr.setRequestHeader('apikey', mySupabaseKey);
                    xhr.setRequestHeader('Content-Type', appFile.type || 'application/octet-stream');

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percent = Math.round((event.loaded / event.total) * 100);
                            progressBar.style.width = percent + '%';
                            status.innerText = `Uploading app file... ${percent}%`;
                        }
                    };
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) resolve();
                        else reject(new Error("App upload failed"));
                    };
                    xhr.onerror = () => reject(new Error("Network error during app upload"));
                    xhr.send(appFile);
                });

                // Step C: Save to Database
                status.innerText = 'Saving database record...';
                const { data: { publicUrl: appDownloadUrl } } = dbClient.storage.from('downloads').getPublicUrl(safeFileName);

                const appData = {
                    app_name: document.getElementById('app-name').value,
                    short_desc: document.getElementById('app-desc').value,
                    platform: document.getElementById('app-platform').value,
                    download_url: appDownloadUrl,
                    icon_url: finalIconUrl // Will be null if no icon was uploaded, triggering your fallback
                };

                const { error: dbError } = await dbClient.from('published_apps').insert([appData]);
                if (dbError) throw dbError;

                status.style.color = 'green';
                status.innerText = 'App Published Successfully!';
                
                appForm.reset();
                setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
                loadApps();

            } catch (err) {
                console.error("App publish error:", err);
                status.style.color = 'red';
                status.innerText = 'Error: ' + err.message;
                progressContainer.style.display = 'none';
            }
            btn.disabled = false;
        });
    }

    // 7. PUBLISH NEW ARTICLE (FILE UPLOAD + DATABASE)
    const articleForm = document.getElementById('article-form');
    if (articleForm) {
        articleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Publishing new article...");

            const btn = document.getElementById('art-submit-btn');
            const status = document.getElementById('art-status');
            const fileInput = document.getElementById('art-image');
            const file = fileInput.files[0];
            
            btn.disabled = true;
            status.style.color = 'blue';
            status.innerText = 'Uploading image to Cloud Storage...';

            try {
                // Step A: Upload Image to Supabase
                const safeFileName = `article_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const { data: uploadData, error: uploadError } = await dbClient.storage
                    .from('downloads')
                    .upload(safeFileName, file);

                if (uploadError) throw uploadError;

                // Step B: Get the Public URL
                const { data: { publicUrl } } = dbClient.storage.from('downloads').getPublicUrl(safeFileName);

                status.innerText = 'Saving article to database...';

                // Step C: Insert into database
                const artData = {
                    title: document.getElementById('art-title').value,
                    "desc": document.getElementById('art-desc').value, 
                    image: publicUrl, // Using the new uploaded image URL
                    tag: 'News',
                    featured: false
                };

                const { error } = await dbClient.from('articles').insert([artData]);
                if (error) throw error;

                status.style.color = 'green';
                status.innerText = 'Article Published Successfully!';
                articleForm.reset();
            } catch (err) {
                console.error("Article publish error:", err);
                status.style.color = 'red';
                status.innerText = 'Error: ' + err.message;
            }
            btn.disabled = false;
        });
    }

    // 8. MANAGE ARTICLES (LOAD, EDIT, DELETE)
    window.articlesData = []; // Store data globally for the edit modal

    async function loadArticles() {
        const tbody = document.getElementById('articles-tbody');
        tbody.innerHTML = '<tr><td colspan="3">Loading articles...</td></tr>';

        const { data, error } = await dbClient.from('articles').select('*').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Error: ${error.message}</td></tr>`;
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No articles published yet.</td></tr>';
            return;
        }

        window.articlesData = data;

        tbody.innerHTML = data.map(art => {
            const dateStr = new Date(art.created_at).toLocaleDateString();
            return `<tr>
                <td><strong>${art.title}</strong></td>
                <td>${dateStr}</td>
                <td>
                    <button onclick="openEditArticleModal(${art.id})" style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteArticle(${art.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    // Delete Article
    window.deleteArticle = async function(id) {
        if (!confirm("Are you sure you want to delete this article? This cannot be undone.")) return;
        
        const { error } = await dbClient.from('articles').delete().eq('id', id);
        
        if (error) {
            alert("Error deleting article: " + error.message);
        } else {
            loadArticles();
        }
    };

    // Open Edit Modal
    window.openEditArticleModal = function(id) {
        const article = window.articlesData.find(a => a.id === id);
        if (!article) return;

        document.getElementById('edit-art-id').value = article.id;
        document.getElementById('edit-art-title').value = article.title;
        document.getElementById('edit-art-desc').value = article.desc;
        document.getElementById('edit-art-image').value = ''; // Reset file input
        document.getElementById('edit-art-status').innerText = '';

        document.getElementById('edit-article-modal').style.display = 'flex';
    };

    // Close Edit Modal
    window.closeEditArticleModal = function() {
        document.getElementById('edit-article-modal').style.display = 'none';
    };

    // Save Edited Article
    window.saveEditedArticle = async function() {
        const btn = document.getElementById('save-edit-art-btn');
        const status = document.getElementById('edit-art-status');
        const id = document.getElementById('edit-art-id').value;
        const fileInput = document.getElementById('edit-art-image');
        
        btn.disabled = true;
        status.style.color = 'blue';
        status.innerText = 'Saving changes...';

        try {
            let updateData = {
                title: document.getElementById('edit-art-title').value,
                "desc": document.getElementById('edit-art-desc').value
            };

            // If the user selected a new image, upload it first
            if (fileInput.files.length > 0) {
                status.innerText = 'Uploading new image...';
                const file = fileInput.files[0];
                const safeFileName = `article_edit_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                
                const { error: uploadError } = await dbClient.storage.from('downloads').upload(safeFileName, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = dbClient.storage.from('downloads').getPublicUrl(safeFileName);
                updateData.image = publicUrl;
            }

            status.innerText = 'Updating database...';
            const { error } = await dbClient.from('articles').update(updateData).eq('id', id);
            if (error) throw error;

            status.style.color = 'green';
            status.innerText = 'Article Updated Successfully!';
            
            // Refresh table and close modal after 1 second
            setTimeout(() => {
                closeEditArticleModal();
                loadArticles();
            }, 1000);

        } catch (err) {
            console.error("Edit error:", err);
            status.style.color = 'red';
            status.innerText = 'Error: ' + err.message;
        }
        btn.disabled = false;
    };

    // 9. MANAGE APPS (LOAD, EDIT, DELETE)
    window.appsData = [];

    async function loadApps() {
        const tbody = document.getElementById('apps-tbody');
        tbody.innerHTML = '<tr><td colspan="4">Loading apps...</td></tr>';

        const { data, error } = await dbClient.from('published_apps').select('*').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No apps published yet.</td></tr>';
            return;
        }

        window.appsData = data;

        tbody.innerHTML = data.map(app => {
            const dateStr = new Date(app.created_at).toLocaleDateString();
            const icon = app.platform.toLowerCase() === 'windows' ? '<i class="fab fa-windows" style="color: #0078D6;"></i>' : '<i class="fab fa-android" style="color: #3DDC84;"></i>';
            
            return `<tr>
                <td><strong>${app.app_name}</strong></td>
                <td>${icon} ${app.platform}</td>
                <td>${dateStr}</td>
                <td>
                    <button onclick="openEditAppModal(${app.id})" style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteApp(${app.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    // Delete App
    window.deleteApp = async function(id) {
        if (!confirm("Are you sure you want to delete this app? This cannot be undone.")) return;
        
        const { error } = await dbClient.from('published_apps').delete().eq('id', id);
        if (error) alert("Error deleting app: " + error.message);
        else loadApps();
    };

    // Open Edit App Modal
    window.openEditAppModal = function(id) {
        const app = window.appsData.find(a => a.id === id);
        if (!app) return;

        document.getElementById('edit-app-id').value = app.id;
        document.getElementById('edit-app-name').value = app.app_name;
        document.getElementById('edit-app-desc').value = app.short_desc;
        document.getElementById('edit-app-platform').value = app.platform;
        document.getElementById('edit-app-file').value = ''; // Reset file input
        document.getElementById('edit-app-status').innerText = '';

        document.getElementById('edit-app-modal').style.display = 'flex';
    };

    // Close Edit App Modal
    window.closeEditAppModal = function() {
        document.getElementById('edit-app-modal').style.display = 'none';
    };

    // Save Edited App
    window.saveEditedApp = async function() {
        const btn = document.getElementById('save-edit-app-btn');
        const status = document.getElementById('edit-app-status');
        const id = document.getElementById('edit-app-id').value;
        const fileInput = document.getElementById('edit-app-file');
        
        btn.disabled = true;
        status.style.color = 'blue';
        status.innerText = 'Saving changes...';

        try {
            let updateData = {
                app_name: document.getElementById('edit-app-name').value,
                short_desc: document.getElementById('edit-app-desc').value,
                platform: document.getElementById('edit-app-platform').value
            };

            // Upload a new file if one was selected
            if (fileInput.files.length > 0) {
                status.innerText = 'Uploading new file...';
                const file = fileInput.files[0];
                const safeFileName = `app_edit_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                
                const { error: uploadError } = await dbClient.storage.from('downloads').upload(safeFileName, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = dbClient.storage.from('downloads').getPublicUrl(safeFileName);
                updateData.download_url = publicUrl;
            }

            status.innerText = 'Updating database...';
            const { error } = await dbClient.from('published_apps').update(updateData).eq('id', id);
            if (error) throw error;

            status.style.color = 'green';
            status.innerText = 'App Updated Successfully!';
            
            setTimeout(() => {
                closeEditAppModal();
                loadApps();
            }, 1000);

        } catch (err) {
            console.error("Edit app error:", err);
            status.style.color = 'red';
            status.innerText = 'Error: ' + err.message;
        }
        btn.disabled = false;
    };
});