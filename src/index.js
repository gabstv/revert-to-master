const { Command, flags } = require("@oclif/command");
const { cli } = require("cli-ux");
const execa = require("execa");
const axios = require("axios");
const parseRepo = require("parse-repo");
const util = require("util");

class RevertMastersCommand extends Command {
  async init() {
    var defaultBranch = "master";
    try {
      defaultBranch = (
        await execa("git", ["config", "--get", "core.defaultBranch"])
      ).stdout;
    } catch (error) {
      // config is not set, safe to ignore
      if (error.exitCode !== 1) {
        this.error(error);
      }
    }

    RevertMastersCommand.description = `Use this script to rename your default Git branch from 'main' to '${defaultBranch}'`;

    RevertMastersCommand.flags = {
      version: flags.version({ char: "v" }),
      help: flags.help({ char: "h" }),
      branch: flags.string({
        char: "b",
        description:
          "The branch name to create. If `core.defaultBranch` is set, the script uses that branch name as the default.",
        default: defaultBranch,
      }),
    };
  }

  async run() {
    this.init();
    const { flags } = this.parse(RevertMastersCommand);

    // check branch
    const branch = flags.branch;
    try {
      await execa("git", ["check-ref-format", "--branch", branch]);
    } catch (error) {
      this.error(error);
    }

    // check origin
    let origin;
    try {
      origin = (await execa("git", ["remote", "get-url", "origin"])).stdout;
    } catch (error) {
      this.error(error);
    }

    const parsedRepo = parseRepo(origin);
    const nwo = parsedRepo.repository;
    const host = parsedRepo.host;

    if (host != "github.com") {
      this.log(
        "Ah! Sorry. This tool only works for repositories on GitHub.com for now."
      );
      return;
    }

    this.log(
      `This script will create a new branch off of \`main\` called \`${branch}\`.\n\n` +
        `It will then set \`${branch}\` as the default branch, and delete the \`main\` branch.\n` +
        `\nThis will modify the \`${nwo}\` repository on ${host}.\n` +
        "\n*** These are DESTRUCTIVE actions! ***\n"
    );
    const choice = await cli.prompt("Do you understand [y/n]?");
    if (choice != "y") {
      this.log(
        `I expected you to say 'y' but you did not, so I won't do anything.`
      );
      return;
    }

    const token = await cli.prompt("What is your GitHub API token?", {
      type: "hide",
    });

    this.log("Fetching origin...");
    try {
      await execa("git", ["fetch", "origin"]);
    } catch (error) {
      this.error(error);
    }

    try {
      await execa("git", ["checkout", "-b", branch, "origin/main"]);
    } catch (error) {
      this.error(error);
    }

    this.log(`Creating \`${branch}\` and pushing it up...`);

    try {
      await execa("git", ["push", "origin", branch]);
    } catch (error) {
      this.error(error);
    }

    try {
      const { stdout } = await execa("git", [
        "branch",
        "--set-upstream-to",
        `origin/${branch}`,
      ]);
      this.log(stdout);
    } catch (error) {
      this.error(error);
    }

    this.log(`Setting ${host} branch to \`${branch}\` ...`);

    try {
      const data = { default_branch: branch };
      const options = {
        method: "PATCH",
        headers: { Authorization: `token ${token}` },
        data: data,
        url: `https://api.github.com/repos/${nwo}`,
      };

      await axios(options);
    } catch (e) {
      this.error(
        util.inspect(e.response.data, { showHidden: false, depth: null })
      );
    }

    try {
      const { stdout } = await execa("git", ["branch", "-D", "main"]);
      console.log(stdout);
    } catch (error) {
      this.error(error);
    }

    this.log(`Deleting \`master\` on ${host} ...`);
    try {
      await execa("git", ["push", "origin", ":main"]);
    } catch (e) {
      this
        .log(`\n*** I could not delete the main branch on GitHub! Probably because it has branch protection...
Here's what they said:\n${e}\n\n`);
    }

    this.log(`\nAll done! PS: GitHub, drop identity politics`);
  }
}

module.exports = RevertMastersCommand;
