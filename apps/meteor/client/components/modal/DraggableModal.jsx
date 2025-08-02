import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@rocket.chat/ui-contexts';

const DraggableModal = ({
	isInitiallyOpen = true,
	onClose = null,
	onConfirm = null,
	url = null,
	title = 'Draggable Modal',
	children = null,
	isVisible = true,
	userSelectorComponent = null, // New prop to control visibility without destroying
}) => {
	const [isOpen, setIsOpen] = useState(isInitiallyOpen);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isMaximized, setIsMaximized] = useState(false);
	const [position, setPosition] = useState(() => ({
		x: Math.max(20, window.innerWidth / 2 - 300), // Responsive center with min margin
		y: Math.max(20, window.innerHeight / 2 - 250), // Responsive center with min margin
	}));
	const [size, setSize] = useState(() => ({
		width: Math.min(750, window.innerWidth - 40), // Max width with 20px margin on each side
		height: Math.min(500, window.innerHeight - 40), // Max height with 20px margin on each side
	}));
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [showUserSelector, setShowUserSelector] = useState(false);
	const t = useTranslation();

	const modalRef = useRef(null);
	const headerRef = useRef(null);

	useEffect(() => {
		const handleMouseMove = (e) => {
			if (isDragging && !isMaximized) {
				setPosition({
					x: e.clientX - dragOffset.x,
					y: e.clientY - dragOffset.y,
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, dragOffset, isMaximized]);

	useEffect(() => {
		// Define the handler for messages from the iframe
		function handleIframeMessage(event) {
			// Check if the message is of type 'timeoutDone'
			if (event.data.type === 'timeoutDone') {
				console.log('Timeout is over:', event.data.message);
				// Perform actions like closing the modal or updating state
				onClose();
			}
		}
		window.addEventListener('message', handleIframeMessage);

		// Cleanup the event listener on component unmount
		return () => {
			window.removeEventListener('message', handleIframeMessage);
		};
	}, [onClose]);

	useEffect(() => {
		const handleResize = () => {
			if (!isMaximized && !isMinimized) {
				const newWidth = Math.min(600, window.innerWidth - 40); // Restore to preferred size or constrain
				const newHeight = Math.min(500, window.innerHeight - 40);

				// Update size - allow growth back to original dimensions
				setSize((prev) => ({
					width: Math.max(newWidth, Math.min(prev.width, window.innerWidth - 40)),
					height: Math.max(newHeight, Math.min(prev.height, window.innerHeight - 40)),
				}));

				// Adjust position if modal goes off screen
				setPosition((prev) => ({
					x: Math.max(0, Math.min(prev.x, window.innerWidth - newWidth - 20)),
					y: Math.max(0, Math.min(prev.y, window.innerHeight - newHeight - 20)),
				}));
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [isMaximized, isMinimized]);

	const handleMouseDown = (e) => {
		if (isMaximized) return;

		const rect = modalRef.current.getBoundingClientRect();
		setDragOffset({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		});
		setIsDragging(true);
	};

	const toggleMinimize = () => {
		if (isMaximized) {
			// If currently maximized, first restore to normal size, then minimize
			setIsMaximized(false);
			setIsMinimized(true);
		} else {
			setIsMinimized(!isMinimized);
		}
	};

	const toggleMaximize = () => {
		setIsMaximized(!isMaximized);
		if (!isMaximized) {
			setIsMinimized(false);
		}
	};

	const closeModal = () => {
		if (onClose) {
			onClose();
		}
	};

	const openModal = () => {
		setIsOpen(true);
	};

	// Don't render anything if not visible
	if (!isVisible || !isOpen) {
		return null;
	}

	const getModalStyle = () => {
		if (isMaximized) {
			return {
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				zIndex: 1000,
				backgroundColor: 'white',
				borderRadius: 0,
				boxShadow: 'none',
			};
		}

		if (isMinimized) {
			return {
				position: 'fixed',
				bottom: '20px',
				right: '20px',
				width: Math.min(200, window.innerWidth - 40), // Responsive minimized width
				height: '40px',
				zIndex: 1000,
				backgroundColor: 'white',
				borderRadius: '6px',
				boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
				cursor: 'pointer',
			};
		}

		return {
			position: 'fixed',
			left: Math.max(0, Math.min(position.x, window.innerWidth - size.width)),
			top: Math.max(0, Math.min(position.y, window.innerHeight - size.height)),
			width: size.width,
			height: size.height,
			zIndex: 1000,
			backgroundColor: 'white',
			borderRadius: '8px',
			boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
			cursor: isDragging ? 'grabbing' : 'default',
		};
	};

	if (!isOpen) {
		return (
			<div style={{ padding: '32px' }}>
				<button
					onClick={openModal}
					style={{
						padding: '8px 24px',
						backgroundColor: '#3b82f6',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '14px',
						fontWeight: '500',
						transition: 'background-color 0.2s ease',
					}}
					onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
					onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
				>
					Open Modal
				</button>
			</div>
		);
	}

	return (
		<>
			{/* Backdrop - only show when not minimized and don't close on click */}
			{!isMinimized && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						zIndex: 999,
					}}
				/>
			)}

			{/* Modal */}
			<div
				ref={modalRef}
				style={{
					...getModalStyle(),
					border: '1px solid #d1d5db',
					overflow: 'hidden',
				}}
			>
				{/* Header */}
				<div
					ref={headerRef}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: window.innerWidth < 768 ? '8px' : '12px', // Responsive padding
						backgroundColor: '#f3f4f6',
						borderBottom: '1px solid #d1d5db',
						userSelect: 'none',
						cursor: isMaximized ? 'default' : 'grab',
						...(isDragging && !isMaximized && { cursor: 'grabbing' }),
					}}
					onMouseDown={handleMouseDown}
					onClick={isMinimized ? toggleMinimize : undefined}
				>
					<h3
						style={{
							fontSize: window.innerWidth < 768 ? '16px' : '18px', // Responsive font size
							fontWeight: '600',
							color: '#1f2937',
							margin: 0,
						}}
					>
						{isMinimized ? `${title} (Minimized)` : title}
					</h3>

					{!isMinimized && (
						<div style={{ display: 'flex', alignItems: 'center', gap: window.innerWidth < 768 ? '4px' : '8px' }}>
							{/* Minimize Button */}
							<button
								onClick={toggleMinimize}
								style={{
									width: window.innerWidth < 768 ? '20px' : '24px', // Responsive button size
									height: window.innerWidth < 768 ? '20px' : '24px',
									backgroundColor: '#eab308',
									border: 'none',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'white',
									fontSize: window.innerWidth < 768 ? '10px' : '12px',
									cursor: 'pointer',
									transition: 'background-color 0.2s ease',
								}}
								onMouseEnter={(e) => (e.target.style.backgroundColor = '#ca8a04')}
								onMouseLeave={(e) => (e.target.style.backgroundColor = '#eab308')}
								title='Minimize'
							>
								−
							</button>

							{/* Maximize Button */}
							<button
								onClick={toggleMaximize}
								style={{
									width: window.innerWidth < 768 ? '20px' : '24px',
									height: window.innerWidth < 768 ? '20px' : '24px',
									backgroundColor: '#22c55e',
									border: 'none',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'white',
									fontSize: window.innerWidth < 768 ? '10px' : '12px',
									cursor: 'pointer',
									transition: 'background-color 0.2s ease',
								}}
								onMouseEnter={(e) => (e.target.style.backgroundColor = '#16a34a')}
								onMouseLeave={(e) => (e.target.style.backgroundColor = '#22c55e')}
								title={isMaximized ? 'Restore' : 'Maximize'}
							>
								{isMaximized ? '⧉' : '□'}
							</button>
							{/* Close Button */}

							<button
								onClick={closeModal}
								style={{
									width: '24px',
									height: '24px',
									backgroundColor: '#ef4444',
									border: 'none',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'white',
									fontSize: '12px',
									cursor: 'pointer',
									transition: 'background-color 0.2s ease',
								}}
								onMouseEnter={(e) => (e.target.style.backgroundColor = '#dc2626')}
								onMouseLeave={(e) => (e.target.style.backgroundColor = '#ef4444')}
								title='Close'
							>
								×
							</button>
						</div>
					)}
				</div>

				{/* Content */}
				{
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							height: isMinimized ? '0' : isMaximized ? 'calc(100vh - 60px)' : 'calc(100% - 60px)',
							overflow: 'hidden',
						}}
					>
						{/* Navbar */}
						{!isMinimized && (
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '8px 16px',
									backgroundColor: '#f9fafb',
									borderBottom: '1px solid #e5e7eb',
									minHeight: '40px',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
									<button
										onClick={() => setShowUserSelector(true)}
										style={{
											padding: '6px 12px',
											backgroundColor: '#3b82f6',
											color: 'white',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											fontSize: '14px',
											fontWeight: '500',
											transition: 'background-color 0.2s ease',
											display: 'flex',
											alignItems: 'center',
											gap: '6px',
										}}
										onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
										onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
									>
										👥 {t('Add_users')}
									</button>
								</div>
							</div>
						)}

						{/* iframe */}
						<div
							style={{
								flex: 1,
								overflow: 'hidden',
							}}
						>
							<iframe
								allow='camera; microphone; fullscreen; display-capture; autoplay'
								src={url || 'https://meet.golrang.com/?lang=fa'}
								style={{
									width: '100%',
									height: '100%',
									border: '0',
									display: 'block',
								}}
							/>
							{/* User Selector Component */}
							{showUserSelector && userSelectorComponent && (
								<div
									style={{
										position: 'fixed',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										backgroundColor: 'rgba(0, 0, 0, 0.5)',
										zIndex: 1002,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
									onClick={() => setShowUserSelector(false)}
								>
									<div
										onClick={(e) => e.stopPropagation()}
										style={{
											backgroundColor: 'white',
											borderRadius: '8px',
											padding: '20px',
											maxWidth: '500px',
											maxHeight: '70vh',
											overflow: 'auto',
										}}
									>
										{React.cloneElement(userSelectorComponent, {
											onClose: () => setShowUserSelector(false),
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				}
			</div>
		</>
	);
};

export default DraggableModal;
