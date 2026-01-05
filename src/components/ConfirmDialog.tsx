/**
 * View Layer: ConfirmDialog Component
 * 確認ダイアログのUI表示
 * ローカルな表示状態のみを管理
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmButtonText = "削除",
  cancelButtonText = "キャンセル",
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel-button" onClick={onCancel}>
            {cancelButtonText}
          </button>
          <button className="confirm-dialog-button" onClick={onConfirm}>
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
