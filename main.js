const fs = require("fs");
const Fuse = require("fuse.js");
const axios = require("axios");
const cheerio = require("cheerio");

class robloxCode {
  constructor(options = {}) {
    this.cache = options.cache ?? false;
    this.ttl = options.ttl ?? 300000;
    this.updateInterval = options.updateInterval ?? 100;
    this.cacheFile = "cache/code.json";

    this.#ensureCacheDir();

    try {
      this.articles = JSON.parse(
        fs.readFileSync("cache/data.json", "utf-8")
      );
    } catch {
      this.articles = [];
    }

    this.fuse = new Fuse(this.articles, {
      keys: ["title", "slug"],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });
  }

  #ensureCacheDir() {
    if (!fs.existsSync("cache")) {
      fs.mkdirSync("cache", { recursive: true });
    }
  }

  #readCache() {
    try {
      return JSON.parse(fs.readFileSync(this.cacheFile, "utf8"));
    } catch {
      return {};
    }
  }

  #writeCache(data) {
    fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
  }

  #appendStat(slug) {
    const statFile = "cache/stat.json";
    let stats = {};

    try {
      stats = JSON.parse(fs.readFileSync(statFile, "utf8"));
      if (Array.isArray(stats)) {
        stats = stats.reduce((acc, item) => {
          if (item && item.slug) {
            acc[item.slug] = {
              request: item.request ?? 0,
              _ts: item._ts ?? new Date().toISOString(),
            };
          }
          return acc;
        }, {});
      }
    } catch {
      stats = {};
    }

    if (typeof stats.requests !== "number") {
      stats.requests = Object.values(stats).reduce(
        (sum, item) => sum + (item?.request || 0),
        0
      );
    }

    if (stats[slug]) {
      stats[slug].request += 1;
      stats[slug]._ts = new Date().toISOString();
    } else {
      stats[slug] = {
        request: 1,
        _ts: new Date().toISOString(),
      };
    }

    stats.requests += 1;
    fs.writeFileSync(statFile, JSON.stringify(stats, null, 2));
  }

  #getTotalRequests() {
    const statFile = "cache/stat.json";
    try {
      let stats = JSON.parse(fs.readFileSync(statFile, "utf8"));
      if (Array.isArray(stats)) {
        stats = stats.reduce((acc, item) => {
          if (item && item.slug) {
            acc[item.slug] = {
              request: item.request ?? 0,
              _ts: item._ts ?? new Date().toISOString(),
            };
          }
          return acc;
        }, {});
      }

      if (typeof stats.requests === "number") {
        return stats.requests;
      }

      return Object.values(stats).reduce((sum, item) => sum + (item.request || 0), 0);
    } catch {
      return 0;
    }
  }

  #slugify(text) {
    return text
      ?.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async #crawlerUrl(url) {
    try {
      const res = await axios.get(url);
      const $ = cheerio.load(res.data);

      return {
        message: res.statusText,
        status: res.status,
        response: $,
      };
    } catch (err) {
      return {
        message: err.response?.statusText || err.message,
        status: err.response?.status || 500,
      };
    }
  }

  async update() {
    let c = 1;
    const allResults = [];

    while (true) {
      try {
        const res = await axios.get(
          `https://beebom.com/tag/roblox-codes/page/${c}/`
        );

        const $ = cheerio.load(res.data);

        const result = $("article h3 a")
          .map((i, el) => {
            const url = $(el).attr("href");

            let slug = url?.split("/").filter(Boolean).pop();
            slug = slug?.replace(/^roblox-/, "").replace(/-codes$/, "");

            return {
              slug: this.#slugify(slug),
              title: $(el).text().trim(),
              url,
            };
          })
          .get();

        if (result.length === 0) break;

        allResults.push(...result);
        console.log(`Page ${c}: ${result.length}`);

        c++; 
      } catch (err) {
        console.log("Stopped at page:", c);
        break; 
      }
    }

    console.log("Total:", allResults.length);

    fs.writeFileSync(
      "cache/data.json",
      JSON.stringify(allResults, null, 2)
    );

    this.articles = allResults;
    this.fuse = new Fuse(this.articles, {
      keys: ["title", "slug"],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });

    return {
      message: "Articles updated successfully",
      total: allResults.length,
    };
  }

  async search(query, limit = 10) {
    if (!query || typeof query !== "string") {
      return [];
    }

    if (this.articles.length === 0) {
      await this.update();
    }

    return this.fuse
      .search(query, { limit })
      .map((result) => ({
        title: result.item.title,
        slug: result.item.slug,
      }));
  }

  async getCodeof(slug) {
    slug = this.#slugify(slug);

    if (this.articles.length === 0) {
      await this.update();
    }

    const requestCount = this.#getTotalRequests();
    if (
      this.updateInterval &&
      (requestCount + 1) % this.updateInterval === 0
    ) {
      await this.update();
    }

    if (this.cache) {
      const cache = this.#readCache();
      const entry = cache[slug];

      if (entry && Date.now() - entry._ts <= this.ttl) {
        const { _ts, ...data } = entry;
        this.#appendStat(slug);
        return data;
      }
    }

    const expiredCode = ($) =>
      $(".wp-block-list.is-style-inline-divider-list li")
        .map((i, el) => {
          let code = $(el).text().trim();
          code = code.replace(/\s*\(NEW\)$/i, "");
          return { code };
        })
        .get();

    let { status, response: $, message } =
      await this.#crawlerUrl(`https://beebom.com/${slug}-codes/`);

    if (status === 404) {
      ({ status, response: $, message } =
        await this.#crawlerUrl(
          `https://beebom.com/roblox-${slug}-codes/`
        ));
    }

    if (status !== 200 || !$) {
      const results = this.fuse.search(slug, { limit: 10 });
      this.#appendStat(slug);

      return {
        message: `No codes found for "${slug}"`,
        status,
        suggestions: results.map((r) => r.item.slug),
      };
    }

    let activeCodes = $(`h2[id^="h-all-new"]`)
      .next()
      .find(".wp-block-list li")
      .map((i, el) => {
        let text = $(el).text().trim();
        const isNew = /\(NEW\)$/i.test(text);

        text = text.replace(/\s*\(NEW\)$/i, "");

        const [code = "", description = ""] = text
          .split(":")
          .map((s) => s.trim());

        return { code, description, isNew };
      })
      .get();

    if (!activeCodes.length) {
      activeCodes = $("tbody tr")
        .map((i, el) => {
          let text = $(el).find("td").eq(0).text().trim();
          const isNew = /\(NEW\)$/i.test(text);

          text = text.replace(/\s*\(NEW\)$/i, "");

          const description = $(el)
            .find("td")
            .eq(1)
            .text()
            .trim();

          return { code: text, description, isNew };
        })
        .get();
    }

    const result = {
      message,
      status,
      activeCodes,
      expiredCodes: expiredCode($),
    };

    this.#appendStat(slug);

    if (this.cache) {
      const cache = this.#readCache();
      cache[slug] = { ...result, _ts: Date.now() };
      this.#writeCache(cache);
    }

    return result;
  }
}

module.exports = robloxCode;