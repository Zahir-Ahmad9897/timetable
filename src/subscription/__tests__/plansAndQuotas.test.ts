import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPlanById, getPlanByTier, PLANS } from '../plans';
import { emptyWorkspace } from '../../domain/defaults';
import { workspaceQuotaViolations } from '../workspaceQuotas';

describe('SaaS Subscription Catalog & Quotas', () => {
  it('defines all three standard SaaS tiers with valid structures', () => {
    assert.equal(PLANS.length, 3);
    const tiers = PLANS.map((p) => p.tier);
    assert.ok(tiers.includes('free'));
    assert.ok(tiers.includes('pro'));
    assert.ok(tiers.includes('enterprise'));
  });

  it('retrieves plans by tier name and plan ID', () => {
    const freePlan = getPlanByTier('free');
    assert.equal(freePlan.id, 'plan_free');
    assert.equal(freePlan.price.month, 0);

    const proPlan = getPlanById('plan_pro');
    assert.equal(proPlan.tier, 'pro');
    assert.equal(proPlan.price.month, 20);
    assert.equal(proPlan.price.year, 192); // $16/month (20% off)

    const enterprisePlan = getPlanByTier('enterprise');
    assert.equal(enterprisePlan.id, 'plan_enterprise');
    assert.equal(enterprisePlan.name, 'Mega University');
  });

  it('enforces tier-based quota differentiation', () => {
    const free = getPlanByTier('free');
    const pro = getPlanByTier('pro');
    const enterprise = getPlanByTier('enterprise');

    // Workspace quotas
    assert.equal(free.quotas.maxWorkspaces, 1);
    assert.equal(pro.quotas.maxWorkspaces, 10);
    assert.equal(enterprise.quotas.maxWorkspaces, -1); // Unlimited

    // Feature gates
    assert.equal(free.quotas.excelExport, false);
    assert.equal(pro.quotas.excelExport, true);
    assert.equal(enterprise.quotas.excelExport, true);

    assert.equal(free.quotas.academicImport, true);
    assert.equal(pro.quotas.academicImport, true);
    assert.equal(enterprise.quotas.academicImport, true);

    // AI generation limits
    assert.equal(free.quotas.maxGenerationsPerDay, 5);
    assert.equal(pro.quotas.maxGenerationsPerDay, 100);
    assert.equal(enterprise.quotas.maxGenerationsPerDay, -1);
    assert.equal(free.quotas.maxGenerationsTotal, 5);
    assert.equal(free.quotas.maxDepartments, 5);
    assert.equal(free.quotas.maxSemestersPerDepartment, 8);
    assert.equal(free.quotas.maxSectionsPerSemester, 2);
    assert.equal(free.quotas.maxCourses, 100);
  });

  it('enforces trial workspace limits while Mega stays unlimited', () => {
    const workspace = emptyWorkspace();
    workspace.departments = Array.from({ length: 6 }, (_, index) => ({ id: `d${index}`, code: `D${index}`, name: `Department ${index}` }));
    assert.match(workspaceQuotaViolations(workspace, getPlanByTier('free').quotas)[0] || '', /5 departments/);
    assert.deepEqual(workspaceQuotaViolations(workspace, getPlanByTier('enterprise').quotas), []);
  });

  it('ensures every feature in a plan has a title and inclusion boolean', () => {
    for (const plan of PLANS) {
      assert.ok(plan.features.length >= 5);
      for (const feat of plan.features) {
        assert.ok(typeof feat.title === 'string' && feat.title.length > 0);
        assert.ok(typeof feat.included === 'boolean');
      }
    }
  });
});
