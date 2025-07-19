import React, { useState, useRef, useEffect } from 'react';

const DraggableModal = ({
	isInitiallyOpen = true,
	onClose = null,
	onConfirm = null,
	url = null,
	title = 'Draggable Modal',
	children = null,
	isVisible = true, // New prop to control visibility without destroying
}) => {
	const [isOpen, setIsOpen] = useState(isInitiallyOpen);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isMaximized, setIsMaximized] = useState(false);
	const [position, setPosition] = useState({
		x: window.innerWidth / 2 - 450 / 2, // Center the modal horizontally
		y: window.innerHeight / 2 - 350 / 2, // Center the modal vertically
	});
	const [size, setSize] = useState({
		width: 600, // Increased default width
		height: 500, // Increased default height
	});
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
				width: '200px',
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
			left: position.x,
			top: position.y,
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
						padding: '12px',
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
							fontSize: '18px',
							fontWeight: '600',
							color: '#1f2937',
							margin: 0,
						}}
					>
						{isMinimized ? `${title} (Minimized)` : title}
					</h3>

					{!isMinimized && (
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							{/* Minimize Button */}
							<button
								onClick={toggleMinimize}
								style={{
									width: '24px',
									height: '24px',
									backgroundColor: '#eab308',
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
									width: '24px',
									height: '24px',
									backgroundColor: '#22c55e',
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
				{!isMinimized && (
					<div
						style={{
							padding: '0', // iframe will fill the whole area
							overflow: 'hidden',
							height: isMaximized ? 'calc(100vh - 60px)' : 'calc(100% - 60px)',
						}}
					>
						<iframe
							allow='camera; microphone; fullscreen; display-capture; autoplay'
							src={url || 'https://meet.golrang.com'} // use your fallback URL here
							style={{
								width: '100%',
								height: '100%',
								border: '0',
								display: 'block',
							}}
						/>
					</div>
				)}
			</div>
		</>
	);
};

export default DraggableModal;
