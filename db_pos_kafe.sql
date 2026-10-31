-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 26, 2026 at 06:35 AM
-- Server version: 10.11.16-MariaDB
-- PHP Version: 8.5.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_pos_kafe`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `nama_kategori` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `nama_kategori`, `slug`, `status`) VALUES
(1, 'Coffee', 'coffee', 'active'),
(2, 'Non-Coffee', 'non-coffee', 'active'),
(3, 'Food', 'food', 'active'),
(4, 'Pastry', 'pastry', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tipe_pesanan` enum('Dine-In','Takeaway') NOT NULL,
  `nomor_meja` varchar(20) DEFAULT NULL,
  `total_subtotal` decimal(10,2) NOT NULL,
  `pajak_nominal` decimal(10,2) NOT NULL,
  `diskon_nominal` decimal(10,2) DEFAULT 0.00,
  `grand_total` decimal(10,2) NOT NULL,
  `metode_bayar` varchar(50) NOT NULL,
  `uang_dibayar` decimal(10,2) NOT NULL,
  `uang_kembali` decimal(10,2) NOT NULL,
  `status` enum('Diproses','Selesai','Dibatalkan') DEFAULT 'Diproses',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `invoice_number`, `user_id`, `tipe_pesanan`, `nomor_meja`, `total_subtotal`, `pajak_nominal`, `diskon_nominal`, `grand_total`, `metode_bayar`, `uang_dibayar`, `uang_kembali`, `status`, `created_at`) VALUES
(1, 'TTK-1792989813093-B7A460', 2, 'Takeaway', NULL, 45000.00, 4500.00, 0.00, 49500.00, 'Tunai', 50000.00, 500.00, 'Selesai', '2026-10-26 04:43:33'),
(2, 'TTK-1792990160766-9E623C', 2, 'Dine-In', '30', 77000.00, 6700.00, 10000.00, 73700.00, 'Transfer', 73700.00, 0.00, 'Selesai', '2026-10-26 04:49:20'),
(3, 'TTK-1792990187674-E8D08E', 2, 'Takeaway', NULL, 105000.00, 10500.00, 0.00, 115500.00, 'Tunai', 149999.00, 34499.00, 'Selesai', '2026-10-26 04:49:47'),
(4, 'TTK-1792990225061-50DFB6', 2, 'Dine-In', '12', 70000.00, 7000.00, 0.00, 77000.00, 'Tunai', 100000.00, 23000.00, 'Selesai', '2026-10-26 04:50:25'),
(5, 'TTK-1792990785031-DABB7C', 2, 'Takeaway', NULL, 525000.00, 52500.00, 0.00, 577500.00, 'Tunai', 600000.00, 22500.00, 'Selesai', '2026-10-26 04:59:45'),
(6, 'TTK-1792992269039-AA910A', 2, 'Takeaway', NULL, 25000.00, 2500.00, 0.00, 27500.00, 'Tunai', 50000.00, 22500.00, 'Selesai', '2026-10-26 05:24:29');

-- --------------------------------------------------------

--
-- Table structure for table `order_details`
--

CREATE TABLE `order_details` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `harga_satuan` decimal(10,2) NOT NULL,
  `kuantiti` int(11) NOT NULL,
  `subtotal_baris` decimal(10,2) NOT NULL,
  `catatan_khusus` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_details`
--

INSERT INTO `order_details` (`id`, `order_id`, `product_id`, `harga_satuan`, `kuantiti`, `subtotal_baris`, `catatan_khusus`) VALUES
(1, 1, 5, 20000.00, 1, 20000.00, NULL),
(2, 1, 1, 25000.00, 1, 25000.00, NULL),
(3, 2, 4, 35000.00, 1, 35000.00, NULL),
(4, 2, 2, 22000.00, 1, 22000.00, NULL),
(5, 2, 5, 20000.00, 1, 20000.00, NULL),
(6, 3, 4, 35000.00, 3, 105000.00, NULL),
(7, 4, 3, 28000.00, 1, 28000.00, NULL),
(8, 4, 2, 22000.00, 1, 22000.00, NULL),
(9, 4, 5, 20000.00, 1, 20000.00, NULL),
(10, 5, 4, 35000.00, 15, 525000.00, NULL),
(11, 6, 1, 25000.00, 1, 25000.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `kode_produk` varchar(50) NOT NULL,
  `nama_produk` varchar(150) NOT NULL,
  `harga_jual` decimal(10,2) NOT NULL,
  `harga_pokok` decimal(10,2) NOT NULL,
  `stok` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(20) DEFAULT 'Porsi',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `kode_produk`, `nama_produk`, `harga_jual`, `harga_pokok`, `stok`, `unit`, `created_at`) VALUES
(1, 1, 'CF-001', 'Kopi Susu Gula Aren', 25000.00, 15000.00, 48, 'Cup', '2026-10-26 02:10:45'),
(2, 1, 'CF-002', 'Americano Hot/Ice', 22000.00, 12000.00, 37, 'Cup', '2026-10-26 02:10:45'),
(3, 2, 'NC-001', 'Matcha Latte', 28000.00, 16000.00, 29, 'Cup', '2026-10-26 02:10:45'),
(4, 3, 'FD-001', 'Nasi Goreng Spesial', 35000.00, 18000.00, 1, 'Porsi', '2026-10-26 02:10:45'),
(5, 4, 'PS-001', 'Croissant Butter', 20000.00, 10000.00, 22, 'Porsi', '2026-10-26 02:10:45'),
(7, 2, 'NC-002', 'Vanilla Latte', 30000.00, 15000.00, 2, 'cup', '2026-10-26 05:08:47');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `role` enum('admin','kasir') DEFAULT 'kasir',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `nama_lengkap`, `role`, `status`, `created_at`) VALUES
(1, 'admin', '$2b$10$lZ00jmwiCapj0dgzcyDmHuKyL7Dy/HRJl.Fdcv53hLtN2H9B1VFMe', 'Administrator Utama', 'admin', 'active', '2026-10-26 02:10:45'),
(2, 'kasir', '$2b$10$kduzlNXoFnhA64moFZPL6emyT5HfzVponDz84/8T.JzvQDYXdS2D6', 'Kasir Shift 1', 'kasir', 'active', '2026-10-26 02:10:45'),
(4, 'kasir2', '$2b$10$.0NESlEO8pMIKvyG.v3u6.DDmCrsZInMgk1SyfJzS.SDuZtNkCO9m', 'Kasir Shift 2', 'kasir', 'active', '2026-10-26 05:12:13');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `order_details`
--
ALTER TABLE `order_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode_produk` (`kode_produk`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `order_details`
--
ALTER TABLE `order_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_details`
--
ALTER TABLE `order_details`
  ADD CONSTRAINT `order_details_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_details_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
