# Kane Production — Sauvegardes

Un coffre sécurisé pour les fichiers de sauvegarde JSON de Kane Production (lutte sénégalaise). Les administrateurs se connectent, importent leurs fichiers `.json`, consultent leur contenu (combats, demandes, vidéos, likes) sous forme de tableaux, les téléchargent à nouveau ou les suppriment.

La sauvegarde `kane-production-sauvegarde 2.json` (8 combats) est déjà incluse et apparaît comme premier fichier archivé.

## Fonctionnalités

- Connexion administrateur via Netlify Identity (mot de passe oublié, invitations).
- Import par glisser-déposer d’un ou plusieurs fichiers `.json` (5 Mo max).
- Retrait automatique des données sensibles (mots de passe, jetons) avant l’archivage.
- Aperçu de chaque liste du fichier dans un tableau, téléchargement et suppression.

## Technologies

TanStack Start (React 19), Tailwind CSS 4, composants shadcn/ui, Netlify Blobs pour le stockage des fichiers et Netlify Identity pour l’authentification.

## Donner l’accès administrateur

1. Dans Netlify, ouvrez **Project configuration > Identity** et passez l’inscription (Registration) en **Invite only**.
2. Dans l’onglet **Identity**, cliquez sur **Invite users** et saisissez votre adresse e-mail.
3. Acceptez l’invitation depuis l’e-mail reçu et choisissez votre mot de passe sur le site.
4. De retour dans l’onglet **Identity**, ouvrez votre utilisateur et ajoutez le rôle `admin` dans **Roles**.

Seuls les comptes ayant le rôle `admin` peuvent voir, importer, télécharger ou supprimer des sauvegardes.

## Lancer en local

```bash
pnpm install
netlify dev
```

`netlify dev` fournit l’émulation locale de Netlify Blobs et d’Identity.
