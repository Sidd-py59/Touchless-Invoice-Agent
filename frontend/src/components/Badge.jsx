const colorMap = {
  draft: "badge-gray",
  processing: "badge-blue",
  parsed: "badge-green",
  uploaded: "badge-blue",
  failed: "badge-red",
  validation_pending: "badge-yellow",
  validated: "badge-green",
  approved: "badge-purple",
  invoiced: "badge-purple",
  sent: "badge-blue",
  paid: "badge-green",
  overdue: "badge-red",
  void: "badge-gray",
  pending: "badge-yellow",
  error: "badge-red",
  warning: "badge-yellow",
  info: "badge-blue",
  passed: "badge-green",
  excel: "badge-green",
  pdf: "badge-blue",
  image: "badge-purple",
  email: "badge-yellow",
  handwritten: "badge-gray",
  portal: "badge-blue",
};

export default function Badge({ value }) {
  const cls = colorMap[value?.toLowerCase()] || "badge-gray";
  return <span className={`badge ${cls}`}>{value}</span>;
}
