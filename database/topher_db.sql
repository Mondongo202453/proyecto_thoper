-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3307
-- Tiempo de generación: 30-04-2026 a las 03:58:18
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `topher_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contacto_mensajes`
--

CREATE TABLE `contacto_mensajes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `nombre_remitente` varchar(150) NOT NULL,
  `correo_remitente` varchar(150) NOT NULL,
  `asunto` varchar(200) NOT NULL,
  `mensaje` text NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT 0,
  `recibido_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cotizaciones`
--

CREATE TABLE `cotizaciones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reserva_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` enum('cotizacion','confirmacion','servicio_prestado') NOT NULL DEFAULT 'cotizacion',
  `monto_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `url_pdf` varchar(500) DEFAULT NULL,
  `enviado_correo` tinyint(1) NOT NULL DEFAULT 0,
  `generado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `generado_por` varchar(50) NOT NULL DEFAULT 'sistema'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `reserva_id` bigint(20) UNSIGNED DEFAULT NULL,
  `tipo` enum('correo','sistema') NOT NULL DEFAULT 'sistema',
  `asunto` varchar(200) NOT NULL,
  `mensaje` text NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT 0,
  `enviado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personal`
--

CREATE TABLE `personal` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `especialidad` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `portafolio_eventos`
--

CREATE TABLE `portafolio_eventos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `fecha_evento` date NOT NULL,
  `lugar` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo_evento` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `portafolio_media`
--

CREATE TABLE `portafolio_media` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `portafolio_evento_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` enum('foto','video') NOT NULL DEFAULT 'foto',
  `url_archivo` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0,
  `orden` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `titulo` varchar(200) DEFAULT NULL,
  `subido_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservas`
--

CREATE TABLE `reservas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `numero_solicitud` varchar(20) NOT NULL,
  `nombre_evento` varchar(200) NOT NULL,
  `fecha_evento` date NOT NULL,
  `hora_evento` time NOT NULL,
  `lugar` varchar(200) NOT NULL,
  `municipio` varchar(100) NOT NULL,
  `asistentes` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `notas_internas` text DEFAULT NULL,
  `status_id` bigint(20) UNSIGNED NOT NULL,
  `cancelado_en` datetime DEFAULT NULL,
  `motivo_cancelacion` text DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservation_services`
--

CREATE TABLE `reservation_services` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reserva_id` bigint(20) UNSIGNED NOT NULL,
  `servicio_id` bigint(20) UNSIGNED NOT NULL,
  `tarifa_id` bigint(20) UNSIGNED NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `duracion_horas` decimal(5,2) NOT NULL DEFAULT 1.00,
  `precio_calculado` decimal(12,2) NOT NULL,
  `notas` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reset_tokens`
--

CREATE TABLE `reset_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` bigint(20) UNSIGNED NOT NULL,
  `token` varchar(255) NOT NULL,
  `expira_en` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) NOT NULL DEFAULT '',
  `creado_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `creado_en`) VALUES
(1, 'admin', 'Acceso total al sistema', '2026-04-29 20:32:51'),
(2, 'usuario', 'Cliente registrado', '2026-04-29 20:32:51'),
(3, 'staff', 'Personal operativo', '2026-04-29 20:32:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `categoria` varchar(80) NOT NULL,
  `caracteristicas_tecnicas` text DEFAULT NULL,
  `disponible` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `servicios`
--

INSERT INTO `servicios` (`id`, `nombre`, `descripcion`, `categoria`, `caracteristicas_tecnicas`, `disponible`, `creado_en`, `actualizado_en`) VALUES
(1, 'Shows de Fuegos Artificiales', 'Espectáculos pirotécnicos aéreos de alto impacto para eventos de gran formato.', 'pirotecnia', 'Radio seguridad mínimo 50m. Requiere permiso autoridades.', 1, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(2, 'Chispas Frías (Sparkular)', 'Lluvia de chispas frías de titanio sin riesgo de incendio.', 'frio', 'Temperatura aprox. 40°C. Altura regulable 1m–4m.', 1, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(3, 'Efectos con CO₂', 'Chorros de CO₂ de alta presión que crean nubes frías espectaculares.', 'co2', 'Tanques de 50lb incluidos. Alcance hasta 6m.', 1, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(4, 'Máquina de Humo Bajo', 'Niebla densa que cubre el suelo ideal para entradas artísticas.', 'humo', 'Fluido base agua. Duración 3-5 min por ciclo.', 1, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(5, 'Lanzador de Confeti', 'Cañones de confeti manual y eléctrico para finales de show.', 'confeti', 'Confeti biodegradable disponible. Alcance hasta 15m.', 1, '2026-04-29 20:32:51', '2026-04-29 20:32:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicio_imagenes`
--

CREATE TABLE `servicio_imagenes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `servicio_id` bigint(20) UNSIGNED NOT NULL,
  `url_imagen` varchar(500) NOT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0,
  `orden` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `alt_text` varchar(200) DEFAULT NULL,
  `subido_en` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `staff_assignments`
--

CREATE TABLE `staff_assignments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reserva_id` bigint(20) UNSIGNED NOT NULL,
  `personal_id` bigint(20) UNSIGNED NOT NULL,
  `rol_en_evento` varchar(100) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `confirmado` tinyint(1) NOT NULL DEFAULT 0,
  `notas` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `statuses`
--

CREATE TABLE `statuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `categoria` varchar(50) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#6B7280',
  `icono` varchar(50) NOT NULL DEFAULT 'circle'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `statuses`
--

INSERT INTO `statuses` (`id`, `codigo`, `nombre`, `categoria`, `color`, `icono`) VALUES
(1, 'ACTIVO', 'Activo', 'usuario', '#22C55E', 'check-circle'),
(2, 'INACTIVO', 'Inactivo', 'usuario', '#6B7280', 'minus-circle'),
(3, 'BLOQUEADO', 'Bloqueado', 'usuario', '#EF4444', 'lock'),
(4, 'PENDIENTE', 'Pendiente', 'reserva', '#F59E0B', 'clock'),
(5, 'CONFIRMADA', 'Confirmada', 'reserva', '#3B82F6', 'thumbs-up'),
(6, 'EN_PROCESO', 'En Proceso', 'reserva', '#8B5CF6', 'loader'),
(7, 'COMPLETADA', 'Completada', 'reserva', '#22C55E', 'check-circle'),
(8, 'CANCELADA', 'Cancelada', 'reserva', '#EF4444', 'x-circle');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `status_history`
--

CREATE TABLE `status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `status_anterior` bigint(20) UNSIGNED DEFAULT NULL,
  `status_nuevo` bigint(20) UNSIGNED NOT NULL,
  `cambiado_por` bigint(20) UNSIGNED NOT NULL,
  `timestamp_cambio` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tarifas`
--

CREATE TABLE `tarifas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `servicio_id` bigint(20) UNSIGNED NOT NULL,
  `unidad` enum('hora','unidad','show') NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `cantidad_minima` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `vigente_desde` date NOT NULL DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tarifas`
--

INSERT INTO `tarifas` (`id`, `servicio_id`, `unidad`, `precio_unitario`, `cantidad_minima`, `activa`, `vigente_desde`) VALUES
(1, 1, 'show', 3500000.00, 1, 1, '2026-04-29'),
(2, 2, 'unidad', 280000.00, 2, 1, '2026-04-29'),
(3, 3, 'hora', 320000.00, 1, 1, '2026-04-29'),
(4, 4, 'hora', 250000.00, 1, 1, '2026-04-29'),
(5, 5, 'unidad', 120000.00, 4, 1, '2026-04-29');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre_completo` varchar(150) NOT NULL,
  `nombre_usuario` varchar(80) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `hash_contrasena` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `status_id` bigint(20) UNSIGNED NOT NULL,
  `intentos_fallidos` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_login` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre_completo`, `nombre_usuario`, `correo`, `hash_contrasena`, `telefono`, `role_id`, `status_id`, `intentos_fallidos`, `bloqueado_hasta`, `ultimo_login`, `creado_en`, `actualizado_en`) VALUES
(1, 'Carlos Admin', 'admin_topher', 'admin@topherproducciones.com', 'hash', '3001234567', 1, 1, 0, NULL, NULL, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(2, 'Andrés Pirotécnico', 'andres_staff', 'andres@topherproducciones.com', 'hash', '3012345678', 3, 1, 0, NULL, NULL, '2026-04-29 20:32:51', '2026-04-29 20:32:51'),
(3, 'Juan Pablo Velilla', 'jpvelilla', 'jpvelilla@gmail.com', 'hash', '3101112233', 2, 1, 0, NULL, NULL, '2026-04-29 20:32:51', '2026-04-29 20:32:51');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `contacto_mensajes`
--
ALTER TABLE `contacto_mensajes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_contacto_usuario` (`usuario_id`);

--
-- Indices de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cotizacion_reserva` (`reserva_id`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notif_usuario` (`usuario_id`),
  ADD KEY `fk_notif_reserva` (`reserva_id`);

--
-- Indices de la tabla `personal`
--
ALTER TABLE `personal`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `fk_personal_usuario` (`usuario_id`);

--
-- Indices de la tabla `portafolio_eventos`
--
ALTER TABLE `portafolio_eventos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `portafolio_media`
--
ALTER TABLE `portafolio_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pmedia_evento` (`portafolio_evento_id`);

--
-- Indices de la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_solicitud` (`numero_solicitud`),
  ADD KEY `fk_reservas_usuario` (`usuario_id`),
  ADD KEY `fk_reservas_status` (`status_id`);

--
-- Indices de la tabla `reservation_services`
--
ALTER TABLE `reservation_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rs_reserva` (`reserva_id`),
  ADD KEY `fk_rs_servicio` (`servicio_id`),
  ADD KEY `fk_rs_tarifa` (`tarifa_id`);

--
-- Indices de la tabla `reset_tokens`
--
ALTER TABLE `reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_reset_usuario` (`usuario_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `servicio_imagenes`
--
ALTER TABLE `servicio_imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_simagen_servicio` (`servicio_id`);

--
-- Indices de la tabla `staff_assignments`
--
ALTER TABLE `staff_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_staff_reserva` (`reserva_id`,`personal_id`),
  ADD KEY `fk_sa_personal` (`personal_id`);

--
-- Indices de la tabla `statuses`
--
ALTER TABLE `statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `status_history`
--
ALTER TABLE `status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sh_anterior` (`status_anterior`),
  ADD KEY `fk_sh_nuevo` (`status_nuevo`),
  ADD KEY `fk_sh_cambiado_por` (`cambiado_por`);

--
-- Indices de la tabla `tarifas`
--
ALTER TABLE `tarifas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tarifas_servicio` (`servicio_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `fk_usuarios_rol` (`role_id`),
  ADD KEY `fk_usuarios_status` (`status_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `contacto_mensajes`
--
ALTER TABLE `contacto_mensajes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `portafolio_eventos`
--
ALTER TABLE `portafolio_eventos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `portafolio_media`
--
ALTER TABLE `portafolio_media`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reservation_services`
--
ALTER TABLE `reservation_services`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reset_tokens`
--
ALTER TABLE `reset_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `servicios`
--
ALTER TABLE `servicios`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `servicio_imagenes`
--
ALTER TABLE `servicio_imagenes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `staff_assignments`
--
ALTER TABLE `staff_assignments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `statuses`
--
ALTER TABLE `statuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `status_history`
--
ALTER TABLE `status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tarifas`
--
ALTER TABLE `tarifas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `contacto_mensajes`
--
ALTER TABLE `contacto_mensajes`
  ADD CONSTRAINT `fk_contacto_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD CONSTRAINT `fk_cotizacion_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `fk_notif_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `personal`
--
ALTER TABLE `personal`
  ADD CONSTRAINT `fk_personal_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `portafolio_media`
--
ALTER TABLE `portafolio_media`
  ADD CONSTRAINT `fk_pmedia_evento` FOREIGN KEY (`portafolio_evento_id`) REFERENCES `portafolio_eventos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `fk_reservas_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`),
  ADD CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `reservation_services`
--
ALTER TABLE `reservation_services`
  ADD CONSTRAINT `fk_rs_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rs_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`),
  ADD CONSTRAINT `fk_rs_tarifa` FOREIGN KEY (`tarifa_id`) REFERENCES `tarifas` (`id`);

--
-- Filtros para la tabla `reset_tokens`
--
ALTER TABLE `reset_tokens`
  ADD CONSTRAINT `fk_reset_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `servicio_imagenes`
--
ALTER TABLE `servicio_imagenes`
  ADD CONSTRAINT `fk_simagen_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `staff_assignments`
--
ALTER TABLE `staff_assignments`
  ADD CONSTRAINT `fk_sa_personal` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`),
  ADD CONSTRAINT `fk_sa_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `status_history`
--
ALTER TABLE `status_history`
  ADD CONSTRAINT `fk_sh_anterior` FOREIGN KEY (`status_anterior`) REFERENCES `statuses` (`id`),
  ADD CONSTRAINT `fk_sh_cambiado_por` FOREIGN KEY (`cambiado_por`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_sh_nuevo` FOREIGN KEY (`status_nuevo`) REFERENCES `statuses` (`id`);

--
-- Filtros para la tabla `tarifas`
--
ALTER TABLE `tarifas`
  ADD CONSTRAINT `fk_tarifas_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `fk_usuarios_status` FOREIGN KEY (`status_id`) REFERENCES `statuses` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
