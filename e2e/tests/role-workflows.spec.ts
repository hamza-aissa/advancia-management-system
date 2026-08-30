import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill('password123')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function openAtlas(page: Page) {
  await page.getByRole('link', { name: 'Clients' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Atlas Distribution' })
  await row.getByRole('link', { name: 'Voir' }).click()
  await expect(page.getByRole('heading', { name: 'Atlas Distribution' })).toBeVisible()
}

test('Agent gère les licences depuis la fiche client sans voir les contrats', async ({ page }) => {
  await login(page, 'agent@advancia.com')
  await openAtlas(page)
  await expect(page.getByRole('heading', { name: 'Licences' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajouter' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Contrat' })).toHaveCount(0)
  await page.getByRole('button', { name: /Modifier/ }).last().click()
  await expect(page.getByRole('dialog', { name: 'Modifier la licence' })).toBeVisible()
})

test('Consultant gère le contrat et ses services sans voir les licences', async ({ page }) => {
  await login(page, 'consultant@advancia.com')
  await openAtlas(page)
  await expect(page.getByRole('heading', { name: 'Contrat' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Licences' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Services et contrat' }).click()
  const dialog = page.getByRole('dialog', { name: 'Modifier le contrat' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Service').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Ajouter' })).toBeVisible()
})

test('Admin voit les deux départements et administre les comptes', async ({ page }) => {
  await login(page, 'admin@advancia.com')
  await openAtlas(page)
  await expect(page.getByRole('heading', { name: 'Licences' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Contrat' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réattribuer' })).toBeVisible()
  await page.getByRole('link', { name: 'Équipe' }).click()
  await expect(page.getByRole('heading', { name: 'Comptes collaborateurs' })).toBeVisible()
  await page.getByRole('button', { name: 'Nouveau compte' }).click()
  await expect(page.getByRole('dialog', { name: 'Nouveau compte' })).toBeVisible()
})

test('Archivage d’une licence exige une confirmation', async ({ page }) => {
  await login(page, 'agent@advancia.com')
  await openAtlas(page)
  await page.getByRole('button', { name: 'Archiver la licence' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Archiver la licence' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Archiver' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(dialog).toHaveCount(0)
})
