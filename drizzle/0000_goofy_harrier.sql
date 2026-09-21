CREATE TABLE `property_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionKey` varchar(64) NOT NULL,
	`unitKey` varchar(32),
	`photoType` varchar(32) NOT NULL DEFAULT 'gallery',
	`imageUrl` text NOT NULL,
	`storageKey` text,
	`imageAlt` varchar(255) NOT NULL,
	`fileName` varchar(255),
	`mimeType` varchar(80),
	`fileSize` int,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isCover` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`isDemo` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
