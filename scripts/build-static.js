const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const Handlebars = require("handlebars");
const { marked } = require("marked");
const hljs = require("highlight.js");

// Configure marked with highlight.js
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

// Helper function to fetch JSON from URL
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on("error", (err) => {
        reject(new Error(`Failed to fetch ${url}: ${err.message}`));
      });
  });
}

// Helper function to fetch text from URL
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", (err) => {
        reject(new Error(`Failed to fetch ${url}: ${err.message}`));
      });
  });
}

// Extract repository ID from URL
function getRepoId(url) {
  const match = url.match(/\/([^/]+)$/);
  return match ? match[1] : "unknown";
}

// Copy directory recursively
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build() {
  console.log("🚀 Building static site...\n");

  const distDir = path.join(__dirname, "../dist");
  const templatesDir = path.join(__dirname, "../templates");

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Copy assets
  const assetsDir = path.join(templatesDir, "assets");
  const distAssetsDir = path.join(distDir, "assets");
  copyDir(assetsDir, distAssetsDir);
  console.log("✓ Copied assets\n");

  // Load templates
  const layoutTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templatesDir, "layout.hbs"), "utf8")
  );
  const indexTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templatesDir, "index.hbs"), "utf8")
  );
  const moduleTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templatesDir, "module.hbs"), "utf8")
  );
  const releasesTemplate = Handlebars.compile(
    fs.readFileSync(path.join(templatesDir, "releases.hbs"), "utf8")
  );

  // Fetch data
  console.log("📡 Fetching remote data...\n");

  const remotesPath = path.join(__dirname, "../json/remotes.json");
  const remotes = JSON.parse(fs.readFileSync(remotesPath, "utf8"));

  const configPath = path.join(__dirname, "../json/config.json");
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  let allModulesData = {};

  for (const remote of remotes) {
    try {
      const modulesUrl = remote.startsWith("http")
        ? `${remote}/json/modules.json`
        : `https://${remote}/json/modules.json`;

      console.log(`  Fetching from: ${modulesUrl}`);
      const repoData = await fetchJSON(modulesUrl);
      const repoId = repoData.id;
      allModulesData[repoId] = repoData;

      const count = repoData.modules ? repoData.modules.length : 0;
      console.log(`  ✓ Loaded ${count} modules from ${repoId}\n`);
    } catch (error) {
      console.warn(`  ⚠ Warning: ${error.message}\n`);
    }
  }

  // Prepare modules list
  const allModules = [];
  Object.entries(allModulesData).forEach(([repoId, repoData]) => {
    if (repoData.modules && Array.isArray(repoData.modules)) {
      repoData.modules.forEach((module) => {
        allModules.push({
          ...module,
          repoId,
          repoName: repoData.name || repoId,
        });
      });
    }
  });

  console.log(`📦 Total modules: ${allModules.length}\n`);

  // Generate index page
  console.log("📄 Generating pages...\n");

  const indexContent = indexTemplate({
    modules: allModules,
    basePath: "./",
  });

  const indexHtml = layoutTemplate({
    title: "MMRL",
    description: "Explore MMRL modules - A comprehensive module explorer for Magisk, KernelSU and APatch",
    ogType: "website",
    content: indexContent,
    showSearch: true,
    basePath: "./",
    generatedAt: new Date().toLocaleString(),
  });

  fs.writeFileSync(path.join(distDir, "index.html"), indexHtml);
  console.log("  ✓ index.html");

  // Generate module pages
  let pageCount = 0;
  for (const [repoId, repoData] of Object.entries(allModulesData)) {
    if (!repoData.modules || !Array.isArray(repoData.modules)) continue;

    for (const module of repoData.modules) {
      const moduleDir = path.join(distDir, repoId, module.id);
      fs.mkdirSync(moduleDir, { recursive: true });

      // Fetch README if it's a URL
      let readmeContent = "";
      if (module.readme && module.readme.startsWith("http")) {
        try {
          readmeContent = await fetchText(module.readme);
        } catch (err) {
          console.warn(
            `    ⚠ Failed to fetch README for ${module.id}: ${err.message}`
          );
          readmeContent = `# ${module.name}\n\n${module.description || ""}`;
        }
      } else if (module.readme) {
        readmeContent = module.readme;
      } else {
        readmeContent = `# ${module.name}\n\n${
          module.description || "No description available."
        }`;

        if (module.author) {
          readmeContent += `\n\n## Author\n${module.author}`;
        }
        if (module.support) {
          readmeContent += `\n\n## Support\n[Get Support](${module.support})`;
        }
      }

      const readmeHtml = marked(readmeContent);

      // Process versions - handle both array of strings and array of objects
      let versions = [];
      if (Array.isArray(module.versions)) {
        versions = module.versions.map(v => {
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && v !== null) {
            return v.version || v.versionName || v.name || JSON.stringify(v);
          }
          return String(v);
        });
      } else if (module.version) {
        versions = [module.version];
      }

      const moduleContent = moduleTemplate({
        module,
        repoId,
        readmeHtml,
        versions,
        basePath: "../../",
      });

      // Prepare meta tags for module page
      const moduleDescription = module.description || `Explore ${module.name} module for MMRL`;
      const moduleImage = module.cover || module.icon || '';
      const moduleAuthor = module.author || '';
      
      const moduleHtml = layoutTemplate({
        title: `${module.name} - MMRL`,
        description: moduleDescription,
        author: moduleAuthor,
        ogType: 'article',
        ogImage: moduleImage,
        ogUrl: '', // Can be set if you have a base URL in config
        twitterCard: moduleImage ? 'summary_large_image' : 'summary',
        content: moduleContent,
        showSearch: false,
        basePath: "../../",
        generatedAt: new Date().toLocaleString(),
      });

      fs.writeFileSync(path.join(moduleDir, "index.html"), moduleHtml);
      console.log(`  ✓ ${repoId}/${module.id}/index.html`);
      pageCount++;

      // Generate releases page
      const releasesDir = path.join(moduleDir, "releases");
      fs.mkdirSync(releasesDir, { recursive: true });

      // Normalize releases from module.versions
      let releases = [];
      if (Array.isArray(module.versions)) {
        releases = await Promise.all(
          module.versions.map(async (v) => {
            const obj = typeof v === "object" && v !== null ? v : { version: v };
            const version =
              obj.version || obj.versionName || obj.name || String(v ?? "");
            const versionCode = obj.versionCode || obj.code || obj.vc;
            const date = obj.date || obj.released || obj.releaseDate || obj.time;
            const zipUrl = obj.zipUrl || obj.url || obj.download || obj.asset;

            let changelogRaw =
              obj.changelog ||
              obj.changeLog ||
              obj.changes ||
              obj.notes ||
              obj.body ||
              "";

            if (
              typeof changelogRaw === "string" &&
              /^https?:\/\//i.test(changelogRaw)
            ) {
              try {
                changelogRaw = await fetchText(changelogRaw);
              } catch (e) {
                // keep original if fetch fails
              }
            }

            const changelogHtml = marked(String(changelogRaw || ""));

            return { version, versionCode, date, zipUrl, changelogHtml };
          })
        );
      }

      const releasesContent = releasesTemplate({
        module,
        repoId,
        releases,
        basePath: "../../../",
      });

      const releasesHtml = layoutTemplate({
        title: `${module.name} Releases - MMRL`,
        description: `View all releases and changelogs for ${module.name}`,
        author: module.author || '',
        ogType: 'article',
        ogImage: module.cover || module.icon || '',
        content: releasesContent,
        showSearch: false,
        basePath: "../../../",
        generatedAt: new Date().toLocaleString(),
      });

      fs.writeFileSync(path.join(releasesDir, "index.html"), releasesHtml);
      console.log(`  ✓ ${repoId}/${module.id}/releases/index.html`);
    }
  }

  console.log(`\n✅ Build complete!`);
  console.log(
    `   Generated ${pageCount + 1} pages (1 index + ${pageCount} modules)`
  );
  console.log(`   Output: ${distDir}\n`);
}

build().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
