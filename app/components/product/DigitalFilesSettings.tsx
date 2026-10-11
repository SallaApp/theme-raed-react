import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

export interface DigitalFilesSettingsProps {
  /** Number of digital files included */
  count?: number;
  /** Allowed file formats (array or comma-separated string) */
  formats?: string | string[];
  /** Download expiration period */
  download_period?: string;
  /** Whether customer has access to future files */
  access_new_files?: boolean;
}

export function DigitalFilesSettings({
  count,
  formats,
  download_period,
  access_new_files,
}: DigitalFilesSettingsProps) {
  const { t } = useTranslation();

  // Return null if no settings provided
  const hasSettings = count || formats || download_period || access_new_files;
  if (!hasSettings) {
    return null;
  }

  const formatsDisplay = Array.isArray(formats) ? formats.join(', ') : formats || '-';

  return (
    <section className="bg-white p-5 rounded-md mb-5 last:mb-0">
      <ul className="space-y-4">
        <li className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="sicon-page" />
            <div className="text-gray-600 text-sm">
              {t('pages.products.number_of_files', 'Number of Files')}
            </div>
          </div>
          <div className="text-gray-900">{count || '-'}</div>
        </li>

        <li className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="sicon-file-archive" />
            <div className="text-gray-600 text-sm">
              {t('pages.products.file_formats', 'File Formats')}
            </div>
          </div>
          <div className="text-gray-900 text-sm">{formatsDisplay}</div>
        </li>

        <li className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="sicon-calendar" />
            <div className="text-gray-600 text-sm">
              {t('pages.products.file_expiration_period', 'File Expiration Period')}
            </div>
          </div>
          <div className="text-gray-900 text-sm">{download_period || '-'}</div>
        </li>

        {access_new_files && (
          <li className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="sicon-rotate" />
              <div className="text-gray-600 text-sm">
                {t('pages.products.free_access_to_new_files', 'Free Access to New Files')}
              </div>
            </div>
            <div className="text-gray-900 text-sm">
              <i className="sicon-check-circle text-lg" />
            </div>
          </li>
        )}
      </ul>
    </section>
  );
}
