#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('ncoctl')
  .description('Configuration management tool for Norce Checkout')
  .version('0.1.0');

// Lazy-load commands only when executed
program
  .command('init [directory]')
  .description('Initialize a new nco-control project')
  .requiredOption('-m, --merchant <name>', 'Merchant identifier')
  .option('--api-url <url>', 'API base URL', 'https://checkout-configuration.example.com')
  .option('-f, --force', 'Overwrite existing files')
  .option('--json', 'Output as JSON')
  .action(async (directory, options) => {
    const { runInit } = await import('../src/commands/init.js');
    await runInit(directory ?? '.', options);
  });

program
  .command('validate')
  .description('Validate local configuration files against their JSON schemas')
  .option('-c, --channel <name>', 'Validate specific channel only')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const { runValidate } = await import('../src/commands/validate.js');
    await runValidate(options);
  });

program
  .command('plan')
  .description('Show changes between local configurations and remote API state')
  .option('-c, --channel <name>', 'Plan specific channel only')
  .option('-v, --verbose', 'Show detailed diff output')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const { runPlan } = await import('../src/commands/plan.js');
    await runPlan(options);
  });

program
  .command('apply')
  .description('Apply local configuration changes to remote API')
  .option('-c, --channel <name>', 'Apply specific channel only')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const { runApply } = await import('../src/commands/apply.js');
    await runApply(options);
  });

program.parse();
