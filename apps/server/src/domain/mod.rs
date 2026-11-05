pub mod chat;
pub mod map;
pub mod meeting;
pub mod player;

pub use chat::*;
pub use map::*;
pub use meeting::*;
pub use player::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_channel_name() {
        assert_eq!(Channel::sanitize_name(" General Chat! "), "general-chat");
        assert_eq!(Channel::sanitize_name("announcements"), "announcements");
    }

    #[test]
    fn test_sanitize_area_def() {
        let area = AreaDef {
            name: " Conference Room ".to_string(),
            x: 10,
            y: 20,
            w: 15,
            h: 12,
            r#private: true,
            meeting: Some(true),
            label: None,
        };
        let sanitized = area.sanitize().expect("should be valid");
        assert_eq!(sanitized.name, "Conference Room");
        assert_eq!(sanitized.label, Some(true));
    }

    #[test]
    fn test_invalid_area_def() {
        let invalid = AreaDef {
            name: "   ".to_string(),
            x: -5,
            y: 20,
            w: 0,
            h: 12,
            r#private: false,
            meeting: None,
            label: None,
        };
        assert!(invalid.sanitize().is_none());
    }

    #[test]
    fn test_player_patch() {
        let look = AvatarLook {
            skin: "#ffe3d1".to_string(),
            hair: "#1f1a17".to_string(),
            hair_style: 1,
            shirt: "#ffffff".to_string(),
            pants: "#2c3e66".to_string(),
            facial_hair: None,
            top: None,
            jacket: None,
            jacket_color: None,
            bottom: None,
            shoes: None,
            hat: None,
            hat_color: None,
            glasses: None,
            glasses_color: None,
            other: None,
            other_color: None,
        };
        let mut player = PlayerState::new("p1".to_string(), "Alice".to_string(), look, 10.0, 15.0);
        assert_eq!(player.name, "Alice");
        assert_eq!(player.x, 10);
        assert_eq!(player.y, 15);

        player.apply_patch(PlayerPatch {
            status_text: Some("Busy coding".to_string()),
            status: Some(Status::Busy),
            mic: Some(true),
            ..Default::default()
        });

        assert_eq!(player.status_text, "Busy coding");
        assert_eq!(player.status, Status::Busy);
        assert!(player.mic);
        assert!(player.role.is_empty());

        let patch = player.apply_patch(PlayerPatch {
            role: Some("  Designer  ".to_string()),
            ..Default::default()
        });
        assert_eq!(player.role, "Designer");
        assert_eq!(patch.role.as_deref(), Some("Designer"));

        player.apply_patch(PlayerPatch {
            role: Some("x".repeat(80)),
            ..Default::default()
        });
        assert_eq!(player.role.len(), 48);

        player.apply_patch(PlayerPatch {
            role: Some(String::new()),
            ..Default::default()
        });
        assert!(player.role.is_empty());
    }
}
