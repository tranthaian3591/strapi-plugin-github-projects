"use strict";
const { request } = require("@octokit/request");
const axios = require("axios");
var md = require("markdown-it")();

module.exports = ({ strapi }) => ({
  getProjectForRepo: async (repo) => {
    const { id } = repo;
    const matchingProjects = await strapi.entityService.findMany(
      "plugin::github-projects.project",
      {
        filters: {
          repositoryId: id,
        },
      }
    );
    if (matchingProjects.length == 1) return matchingProjects[0].id;
    return null;
  },
  getPublicRepos: async () => {
    const result = await request("GET /user/repos", {
      headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
      type: "private", // get repository from github with type ( private | public )
    });

    return Promise.all(
      result.data.map(async (item) => {
        const { id, name, description, html_url, owner, default_branch } = item;
        // https://raw.githubusercontent.com/diligroup/dili-id/main/README.md
        const readmeURL = `https://raw.githubusercontent.com/${owner.login}/${name}/${default_branch}/README.md`;
        // @ts-ignore
        //const longDescription = (await axios.get(readmeURL)).data;
        let longDescription = "";

        try {
          //@ts-ignore
          const result = await axios.get(readmeURL);
          if (result && result.data) {
            longDescription = result.data;
          }
        } catch (error) {
          longDescription = "";
        }

        const repo = {
          id,
          name,
          shortDescription: description,
          url: html_url,
          default_branch,
          readmeURL,
          longDescription:
            longDescription != "" ? (md.render(longDescription)).replace(/(?:\r\n|\r|\n)/g, '<br>') : "",
        };

        // Add some logic to search for an existing project for the current repo.

        const relatedProjectId = await strapi
          .plugin("github-projects")
          .service("getReposService")
          .getProjectForRepo(repo);
        return {
          ...repo,
          projectId: relatedProjectId,
        };
      })
    );
  },
});
