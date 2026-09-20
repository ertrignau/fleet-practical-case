# Fleet Study Case

## Sommaire

- [Français](#français)
  - [Exercise A - Catalog / Cart / Orders](#exercise-a---catalog--cart--orders)
  - [Exercise B - Bug de rafraîchissement](#exercise-b---bug-de-rafraîchissement)
  - [Refactor](#refactor)
  - [Choix techniques](#choix-techniques)
- [English](#english)
  - [Exercise A - Catalog / Cart / Orders](#exercise-a---catalog--cart--orders-1)
  - [Exercise B - Refresh bug](#exercise-b---refresh-bug)
  - [Refactor](#refactor-1)
  - [Technical choices](#technical-choices)

---

# Français

## Exercise A - Catalog / Cart / Orders

J'ai ajouté un domaine `Catalog / Cart / Orders` à l'application existante.

L'idée était de rester simple et de conserver la stack déjà présente : React, Express et SQLite.

### Catalog

Un nouvel onglet `Catalog` permet d'afficher les produits et leurs variantes avec :

- nom du produit ;
- configuration ;
- SKU ;
- prix ;
- stock disponible.

Seuls les produits actifs sont retournés par l'API.

### Cart

Le panier est affiché dans une sidebar du catalogue.

Il permet :

- d'ajouter une variante ;
- d'augmenter ou diminuer une quantité ;
- de supprimer une ligne ;
- d'afficher le total de chaque ligne ;
- d'afficher le total du panier ;
- de créer une commande.

Le panier stocke uniquement l'identifiant de la variante et la quantité.

Les prix et le stock sont vérifiés côté serveur afin de ne pas faire confiance aux valeurs venant du frontend.

### Orders

Lors de la création d'une commande, le backend :

1. récupère le panier ;
2. vérifie le stock disponible ;
3. recalcule les prix et le total ;
4. crée la commande ;
5. crée les lignes de commande ;
6. décrémente le stock ;
7. vide le panier.

Ces opérations sont réalisées dans une transaction SQLite.

Si une étape échoue, la transaction est annulée.

Les lignes de commande conservent aussi un snapshot des informations du produit au moment de l'achat :

- nom ;
- configuration ;
- SKU ;
- prix unitaire.

Cela permet de conserver un historique cohérent même si le catalogue évolue plus tard.

---

## Exercise B - Bug de rafraîchissement

### Cause

Le backend gérait déjà correctement la suppression d'un employé.

Lorsqu'un employé possédant des appareils était supprimé, les appareils étaient bien désassignés avec un `owner_id` mis à `NULL`.

Le problème venait du frontend.

Après la suppression, la liste des employés était rechargée mais pas celle des appareils.

Les données déjà présentes dans le state React restaient donc obsolètes jusqu'à un autre rafraîchissement.

### Correction

Après la suppression d'un employé, les données `employees` et `devices` sont maintenant toutes les deux rechargées.

Cela permet de synchroniser immédiatement l'interface avec l'état réel du backend.

### Trade-off

J'ai choisi de garder un rafraîchissement explicite des données plutôt que d'ajouter une librairie de gestion de cache uniquement pour ce besoin.

Pour une application plus importante, une solution comme TanStack Query pourrait être intéressante pour gérer l'invalidation des données après les mutations.

---

## Refactor

Le code de départ regroupait une grande partie de la logique frontend dans `App.js` et les routes backend dans un seul `server/index.js`.

J'ai séparé le frontend en composants et hooks :

```text
client/src/
├── components/
│   ├── CartSidebar/
│   ├── CatalogPanel/
│   ├── Dashboard/
│   ├── DevicePanel/
│   ├── EmployeePanel/
│   ├── Feedback/
│   ├── Navigation/
│   ├── OrdersPanel/
│   └── shared/
└── hooks/
    ├── useDevices.js
    ├── useEmployees.js
    └── useStore.js
```

Le backend est également séparé entre connexion à la base et routes :

```text
server/
├── db/
│   ├── database.js
│   └── init.js
├── routes/
│   ├── cart.js
│   ├── devices.js
│   ├── employees.js
│   ├── orders.js
│   └── products.js
└── index.js
```

Le but était surtout d'améliorer la lisibilité sans ajouter trop de couches d'abstraction.

Je n'ai volontairement pas ajouté une architecture complète `controller / service / repository`, que je trouve disproportionnée pour la taille du projet.

---

## Choix techniques

### Panier

Le study case ne contient pas de système d'authentification ni de gestion d'utilisateurs.

Le panier est donc global.

Dans une application réelle, il serait associé à un utilisateur ou à une session.

### Validation côté serveur

Le frontend ne décide pas du prix final d'une commande.

Le backend relit les produits, vérifie le stock et recalcule les montants au moment de la création de la commande.

### Transactions

La création d'une commande est transactionnelle afin d'éviter les états partiels, par exemple :

- une commande créée sans toutes ses lignes ;
- un stock seulement partiellement décrémenté ;
- un panier vidé alors que la commande a échoué.

### Prix

Le schéma fourni utilise des valeurs SQLite `REAL` pour les prix.

J'ai conservé ce fonctionnement pour rester cohérent avec la base fournie.

Sur une application de production, je préférerais stocker les montants en centimes sous forme d'entiers afin d'éviter les problèmes de précision liés aux nombres flottants.

---

# English

## Exercise A - Catalog / Cart / Orders

I added a `Catalog / Cart / Orders` domain to the existing application.

The goal was to keep the implementation simple and stay with the existing React, Express and SQLite stack.

### Catalog

A new `Catalog` tab displays products and their variants with:

- product name;
- configuration;
- SKU;
- price;
- available stock.

Only active products are returned by the API.

### Cart

The cart is displayed as a sidebar next to the catalog.

It supports:

- adding a product variant;
- increasing or decreasing quantity;
- removing a cart line;
- displaying line totals;
- displaying the cart total;
- creating an order.

The cart only stores the product variant ID and quantity.

Prices and stock are validated again on the backend instead of trusting values coming from the frontend.

### Orders

When creating an order, the backend:

1. reads the cart;
2. validates available stock;
3. recalculates prices and totals;
4. creates the order;
5. creates the order items;
6. decreases stock;
7. clears the cart.

These operations are executed inside a SQLite transaction.

If one step fails, the transaction is rolled back.

Order items also keep a snapshot of the product information at checkout time:

- product name;
- configuration;
- SKU;
- unit price.

This keeps the order history consistent even if the catalog changes later.

---

## Exercise B - Refresh bug

### Root cause

The backend was already correctly handling employee deletion.

When an employee owning devices was deleted, those devices were correctly unassigned by setting their `owner_id` to `NULL`.

The issue was on the frontend.

After deleting an employee, the employee list was refreshed but the device list was not.

The device data already stored in React state therefore remained stale until another action triggered a refresh.

### Fix

After deleting an employee, both `employees` and `devices` are now refreshed.

This keeps the UI immediately synchronized with the backend state.

### Trade-off

I chose explicit data refetching instead of adding a cache management library only for this case.

For a larger application, something like TanStack Query could make query invalidation easier to manage after mutations.

---

## Refactor

The initial code kept a large part of the frontend logic inside `App.js` and most backend routes inside a single `server/index.js`.

I split the frontend into components and hooks:

```text
client/src/
├── components/
│   ├── CartSidebar/
│   ├── CatalogPanel/
│   ├── Dashboard/
│   ├── DevicePanel/
│   ├── EmployeePanel/
│   ├── Feedback/
│   ├── Navigation/
│   ├── OrdersPanel/
│   └── shared/
└── hooks/
    ├── useDevices.js
    ├── useEmployees.js
    └── useStore.js
```

The backend is also split between database code and routes:

```text
server/
├── db/
│   ├── database.js
│   └── init.js
├── routes/
│   ├── cart.js
│   ├── devices.js
│   ├── employees.js
│   ├── orders.js
│   └── products.js
└── index.js
```

The main goal was readability without adding unnecessary abstraction.

I intentionally did not introduce a full `controller / service / repository` architecture because it felt excessive for a project of this size.

---

## Technical choices

### Cart

The study case does not include authentication or user management.

The cart is therefore global.

In a real application, it would be associated with a user or a session.

### Server-side validation

The frontend does not decide the final order price.

The backend reloads product data, validates stock and recalculates totals when the order is created.

### Transactions

Order creation is transactional to avoid partial states such as:

- an order created without all its items;
- stock being only partially updated;
- the cart being cleared even though the order failed.

### Prices

The provided schema uses SQLite `REAL` values for prices.

I kept this model to stay consistent with the existing database.

In production, I would prefer storing monetary values as integer cents to avoid floating-point precision issues.